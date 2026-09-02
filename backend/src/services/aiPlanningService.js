import prisma from "../config/prisma.js";

// Yaoundé, Cameroon default operational depot coordinates
const DEFAULT_DEPOT = {
  latitude: 3.8480,
  longitude: 11.5021,
  name: "BINOVA Central Dispatch Depot, Yaoundé",
};

/**
 * Calculate Haversine distance in kilometers between two GPS coordinates
 */
function haversineDistanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Intelligent Priority Evaluation based on fill levels and operational thresholds
 */
export function evaluateBinPriority(fillLevel, status, capacity) {
  const fill = Number(fillLevel) || 0;
  let priority = "LOW";
  let reason = "Fill level is below 40%, collection optional.";

  if (fill >= 80) {
    priority = "CRITICAL";
    reason = `Fill level (${fill}%) exceeds the critical 80% threshold. Immediate collection required.`;
  } else if (fill >= 65) {
    priority = "HIGH";
    reason = `Fill level (${fill}%) is high (65–79%) and rapidly approaching maximum capacity.`;
  } else if (fill >= 40) {
    priority = "NORMAL";
    reason = `Fill level (${fill}%) is moderate (40–64%), collection recommended on this route.`;
  }

  if (status === "DAMAGED") {
    priority = "CRITICAL";
    reason = `Bin is reported DAMAGED with ${fill}% fill level. Inspection and waste extraction urgently required.`;
  }

  return { priority, reason, fillLevel: fill };
}

/**
 * Nearest-Neighbor TSP optimization for ordering stops efficiently
 */
function optimizeStopSequence(startPoint, stops) {
  if (!stops || stops.length <= 1) return stops ? [...stops] : [];

  const unvisited = [...stops];
  const ordered = [];
  let currentLat = startPoint.latitude;
  let currentLng = startPoint.longitude;

  // First separate CRITICAL bins so they are prioritized early in the route
  const critical = unvisited.filter((s) => s.priority === "CRITICAL");
  const nonCritical = unvisited.filter((s) => s.priority !== "CRITICAL");

  // Process critical stops first with nearest-neighbor
  while (critical.length > 0) {
    let nearestIndex = 0;
    let minDistance = Infinity;

    for (let i = 0; i < critical.length; i++) {
      const dist = haversineDistanceKm(
        currentLat,
        currentLng,
        critical[i].latitude,
        critical[i].longitude
      );
      if (dist < minDistance) {
        minDistance = dist;
        nearestIndex = i;
      }
    }

    const nextStop = critical.splice(nearestIndex, 1)[0];
    ordered.push(nextStop);
    currentLat = nextStop.latitude;
    currentLng = nextStop.longitude;
  }

  // Then process remaining stops with nearest-neighbor
  while (nonCritical.length > 0) {
    let nearestIndex = 0;
    let minDistance = Infinity;

    for (let i = 0; i < nonCritical.length; i++) {
      const dist = haversineDistanceKm(
        currentLat,
        currentLng,
        nonCritical[i].latitude,
        nonCritical[i].longitude
      );
      if (dist < minDistance) {
        minDistance = dist;
        nearestIndex = i;
      }
    }

    const nextStop = nonCritical.splice(nearestIndex, 1)[0];
    ordered.push(nextStop);
    currentLat = nextStop.latitude;
    currentLng = nextStop.longitude;
  }

  return ordered;
}

/**
 * Fetch real road route geometry and metrics via Mapbox Directions API
 */
async function fetchMapboxRoadRoute(startPoint, orderedStops, mapboxToken) {
  const allPoints = [startPoint, ...orderedStops];
  const validCoordinates = allPoints.filter(
    (p) =>
      p &&
      !isNaN(p.latitude) &&
      !isNaN(p.longitude) &&
      p.latitude !== 0 &&
      p.longitude !== 0
  );

  if (validCoordinates.length < 2) {
    return {
      distanceKm: 0,
      durationMinutes: 0,
      geometry: { type: "LineString", coordinates: [] },
      isRealRoadRoute: false,
    };
  }

  const token = (
    mapboxToken ||
    process.env.MAPBOX_ACCESS_TOKEN ||
    process.env.VITE_MAPBOX_ACCESS_TOKEN ||
    ""
  ).trim();

  // Mapbox Directions supports up to 25 waypoints per request
  if (token && token.startsWith("pk.") && validCoordinates.length <= 25) {
    try {
      const coordsString = validCoordinates
        .map((p) => `${p.longitude.toFixed(6)},${p.latitude.toFixed(6)}`)
        .join(";");

      const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${coordsString}?geometries=geojson&overview=full&steps=true&access_token=${token}`;

      const response = await fetch(url, {
        headers: { "User-Agent": "BINOVA-Route-Optimizer/1.0" },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.routes && data.routes.length > 0) {
          const route = data.routes[0];
          return {
            distanceKm: Number((route.distance / 1000).toFixed(2)),
            durationMinutes: Math.round(route.duration / 60),
            geometry: route.geometry, // GeoJSON LineString
            isRealRoadRoute: true,
            legs: route.legs,
          };
        }
      } else {
        console.warn(
          `Mapbox Directions API responded with status ${response.status}: ${await response.text()}`
        );
      }
    } catch (err) {
      console.warn("Mapbox Directions API request failed, using geometric fallback:", err.message);
    }
  }

  // Graceful Fallback: Calculate approximate road distance (Haversine * 1.3 road curvature factor)
  let totalKm = 0;
  const coordinates = [];

  for (let i = 0; i < validCoordinates.length; i++) {
    coordinates.push([validCoordinates[i].longitude, validCoordinates[i].latitude]);
    if (i > 0) {
      const segKm = haversineDistanceKm(
        validCoordinates[i - 1].latitude,
        validCoordinates[i - 1].longitude,
        validCoordinates[i].latitude,
        validCoordinates[i].longitude
      );
      totalKm += segKm * 1.3; // Standard urban road curvature coefficient
    }
  }

  const durationMin = Math.round((totalKm / 25) * 60); // Assuming 25 km/h urban collection speed

  return {
    distanceKm: Number(totalKm.toFixed(2)),
    durationMinutes: Math.max(durationMin, 5),
    geometry: {
      type: "LineString",
      coordinates,
    },
    isRealRoadRoute: false,
  };
}

/**
 * Generate AI-Assisted Collection Plan Recommendation
 */
export async function generatePlan(options = {}) {
  const {
    binIds,
    minFillThreshold = 40,
    driverIdOverride,
    truckIdOverride,
    driverLatitude,
    driverLongitude,
    mapboxToken,
  } = options;

  // 1. QUERY BINS
  let bins = [];
  if (binIds && Array.isArray(binIds) && binIds.length > 0) {
    bins = await prisma.bin.findMany({
      where: {
        id: { in: binIds.map(Number) },
      },
    });
  } else {
    // Default candidate pool: active or damaged bins
    bins = await prisma.bin.findMany({
      where: {
        status: { in: ["ACTIVE", "DAMAGED"] },
      },
    });
  }

  // Filter valid coordinates
  bins = bins.filter(
    (b) =>
      !isNaN(b.latitude) &&
      !isNaN(b.longitude) &&
      b.latitude >= -90 &&
      b.latitude <= 90 &&
      b.longitude >= -180 &&
      b.longitude <= 180 &&
      !(b.latitude === 0 && b.longitude === 0)
  );

  // Analyze each bin
  const analyzedBins = bins.map((bin) => {
    const { priority, reason } = evaluateBinPriority(
      bin.currentFillLevel,
      bin.status,
      bin.capacity
    );
    const estimatedLoadM3 = Number(
      (((Number(bin.currentFillLevel) || 0) / 100) * (Number(bin.capacity) || 50)).toFixed(2)
    );

    return {
      id: bin.id,
      binCode: bin.binCode,
      latitude: bin.latitude,
      longitude: bin.longitude,
      address: bin.address || "Yaoundé, Cameroon",
      capacity: bin.capacity,
      currentFillLevel: bin.currentFillLevel,
      status: bin.status,
      priority,
      reason,
      estimatedLoadM3,
    };
  });

  // Sort candidate bins by priority (CRITICAL -> HIGH -> NORMAL -> LOW) and fill level
  const priorityRank = { CRITICAL: 4, HIGH: 3, NORMAL: 2, LOW: 1 };
  analyzedBins.sort((a, b) => {
    if (priorityRank[b.priority] !== priorityRank[a.priority]) {
      return priorityRank[b.priority] - priorityRank[a.priority];
    }
    return (b.currentFillLevel || 0) - (a.currentFillLevel || 0);
  });

  // Filter bins to recommend (if no specific binIds requested, select bins >= minFillThreshold or DAMAGED)
  const recommendedBins = (binIds && binIds.length > 0)
    ? analyzedBins
    : analyzedBins.filter((b) => b.currentFillLevel >= minFillThreshold || b.status === "DAMAGED");

  const totalEstimatedWasteM3 = Number(
    recommendedBins.reduce((sum, b) => sum + (b.estimatedLoadM3 || 0), 0).toFixed(2)
  );

  // 2. QUERY & EVALUATE DRIVERS
  const activeDrivers = await prisma.user.findMany({
    where: {
      role: "DRIVER",
      status: "ACTIVE",
    },
    include: {
      truck: true,
      tasks: {
        where: {
          status: { in: ["ASSIGNED", "IN_PROGRESS"] },
        },
      },
    },
  });

  const scoredDrivers = activeDrivers.map((driver) => {
    const activeTasksCount = driver.tasks.length;
    let score = 50;
    const reasons = [];

    // Workload scoring (fewer active tasks is better)
    if (activeTasksCount === 0) {
      score += 35;
      reasons.push("Currently available with 0 pending tasks");
    } else if (activeTasksCount === 1) {
      score += 20;
      reasons.push("Low workload (1 active task)");
    } else if (activeTasksCount === 2) {
      score += 5;
      reasons.push("Moderate workload (2 active tasks)");
    } else {
      score -= 25;
      reasons.push(`High workload (${activeTasksCount} active tasks)`);
    }

    // Truck assignment scoring
    if (driver.truck) {
      if (driver.truck.status === "AVAILABLE" || driver.truck.status === "IN_USE") {
        score += 15;
        reasons.push(`Assigned to operational truck ${driver.truck.registrationNumber}`);
      } else {
        score -= 20;
        reasons.push(`Assigned truck ${driver.truck.registrationNumber} is in ${driver.truck.status}`);
      }
    } else {
      reasons.push("No dedicated truck assigned (fleet vehicle required)");
    }

    // Normalize score between 0 and 100
    score = Math.max(0, Math.min(100, score));

    return {
      id: driver.id,
      firstName: driver.firstName,
      lastName: driver.lastName,
      email: driver.email,
      phone: driver.phone,
      activeTasksCount,
      assignedTruck: driver.truck
        ? {
            id: driver.truck.id,
            registrationNumber: driver.truck.registrationNumber,
            capacity: driver.truck.capacity,
            status: driver.truck.status,
          }
        : null,
      score,
      reason: reasons.join(". ") + ".",
    };
  });

  scoredDrivers.sort((a, b) => b.score - a.score);

  // Selected or recommended driver
  let recommendedDriver = null;
  if (driverIdOverride) {
    recommendedDriver = scoredDrivers.find((d) => d.id === Number(driverIdOverride)) || null;
  }
  if (!recommendedDriver && scoredDrivers.length > 0) {
    recommendedDriver = scoredDrivers[0];
  }

  // 3. QUERY & EVALUATE TRUCKS
  const availableTrucks = await prisma.truck.findMany({
    where: {
      status: { in: ["AVAILABLE", "IN_USE"] },
    },
    include: {
      driver: {
        select: { id: true, firstName: true, lastName: true },
      },
    },
  });

  const scoredTrucks = availableTrucks.map((truck) => {
    let suitabilityScore = 70;
    const warnings = [];
    const reasons = [];

    // Check if truck is assigned to recommended driver
    if (recommendedDriver && truck.driverId === recommendedDriver.id) {
      suitabilityScore += 25;
      reasons.push(`Primary vehicle assigned to driver ${recommendedDriver.firstName} ${recommendedDriver.lastName}`);
    }

    // Capacity verification
    if (truck.capacity >= totalEstimatedWasteM3) {
      suitabilityScore += 10;
      reasons.push(`Adequate capacity (${truck.capacity} m³) for total load (${totalEstimatedWasteM3} m³)`);
    } else {
      suitabilityScore -= 20;
      const deficit = Number((totalEstimatedWasteM3 - truck.capacity).toFixed(1));
      warnings.push(`Load (${totalEstimatedWasteM3} m³) exceeds capacity (${truck.capacity} m³) by ${deficit} m³. Multiple trips needed.`);
    }

    return {
      id: truck.id,
      registrationNumber: truck.registrationNumber,
      capacity: truck.capacity,
      status: truck.status,
      assignedDriver: truck.driver,
      suitabilityScore: Math.max(0, Math.min(100, suitabilityScore)),
      warnings,
      reason: reasons.join(". ") + ".",
    };
  });

  scoredTrucks.sort((a, b) => b.suitabilityScore - a.suitabilityScore);

  let recommendedTruck = null;
  if (truckIdOverride) {
    recommendedTruck = scoredTrucks.find((t) => t.id === Number(truckIdOverride)) || null;
  }
  if (!recommendedTruck) {
    if (recommendedDriver?.assignedTruck) {
      recommendedTruck =
        scoredTrucks.find((t) => t.id === recommendedDriver.assignedTruck.id) ||
        scoredTrucks[0] ||
        null;
    } else {
      recommendedTruck = scoredTrucks[0] || null;
    }
  }

  // 4. ROUTE OPTIMIZATION
  const startPoint = {
    latitude:
      driverLatitude !== undefined && driverLatitude !== null
        ? Number(driverLatitude)
        : DEFAULT_DEPOT.latitude,
    longitude:
      driverLongitude !== undefined && driverLongitude !== null
        ? Number(driverLongitude)
        : DEFAULT_DEPOT.longitude,
    name: driverLatitude ? "Driver Current GPS Location" : DEFAULT_DEPOT.name,
  };

  // Determine efficient sequence
  const orderedStops = optimizeStopSequence(startPoint, recommendedBins).map(
    (stop, index) => ({
      ...stop,
      stopOrder: index + 1,
    })
  );

  // Fetch real road-following route from Mapbox Directions API
  const roadRoute = await fetchMapboxRoadRoute(startPoint, orderedStops, mapboxToken);

  // 5. COMPOSE RESPONSE & WARNINGS
  const planWarnings = [];
  if (recommendedBins.length === 0) {
    planWarnings.push("No bins currently require collection based on the selected thresholds.");
  }
  if (!recommendedDriver) {
    planWarnings.push("No active drivers are currently available in the system.");
  }
  if (!recommendedTruck) {
    planWarnings.push("No operational trucks are currently available in the fleet.");
  }
  if (recommendedTruck && totalEstimatedWasteM3 > recommendedTruck.capacity) {
    planWarnings.push(
      `Estimated waste volume (${totalEstimatedWasteM3} m³) exceeds truck capacity (${recommendedTruck.capacity} m³).`
    );
  }

  const criticalCount = recommendedBins.filter((b) => b.priority === "CRITICAL").length;
  const highCount = recommendedBins.filter((b) => b.priority === "HIGH").length;

  return {
    success: true,
    summary: {
      totalRecommendedBins: recommendedBins.length,
      criticalBinsCount: criticalCount,
      highPriorityCount: highCount,
      totalEstimatedWasteM3,
      totalDistanceKm: roadRoute.distanceKm,
      estimatedDurationMinutes: roadRoute.durationMinutes,
      isRealRoadRoute: roadRoute.isRealRoadRoute,
      warnings: planWarnings,
      generatedAt: new Date().toISOString(),
    },
    startPoint,
    recommendedDriver,
    recommendedTruck,
    orderedStops,
    allCandidateBins: analyzedBins,
    allActiveDrivers: scoredDrivers,
    allAvailableTrucks: scoredTrucks,
    route: {
      distanceKm: roadRoute.distanceKm,
      durationMinutes: roadRoute.durationMinutes,
      geometry: roadRoute.geometry,
      orderedStopIds: orderedStops.map((s) => s.id),
      isRealRoadRoute: roadRoute.isRealRoadRoute,
    },
  };
}

/**
 * Approve AI Plan and Create Official Collection Task
 */
export async function approveAndCreateTasks(approvalData, adminUser) {
  const {
    binIds,
    driverId,
    truckId,
    priority = "AUTO",
    notes,
    routeData,
  } = approvalData;

  if (!binIds || !Array.isArray(binIds) || binIds.length === 0) {
    throw { status: 400, message: "At least one bin must be selected for collection." };
  }
  if (!driverId) {
    throw { status: 400, message: "A driver must be assigned to create collection tasks." };
  }

  // Validate driver
  const driver = await prisma.user.findUnique({
    where: { id: Number(driverId) },
  });
  if (!driver || driver.status !== "ACTIVE" || driver.role !== "DRIVER") {
    throw { status: 400, message: "Selected driver is invalid or inactive." };
  }

  // Validate truck if provided
  let truck = null;
  if (truckId) {
    truck = await prisma.truck.findUnique({
      where: { id: Number(truckId) },
    });
    if (!truck || truck.status === "MAINTENANCE" || truck.status === "INACTIVE") {
      throw { status: 400, message: "Selected truck is unavailable or under maintenance." };
    }
  }

  const adminName = adminUser
    ? `${adminUser.firstName || ""} ${adminUser.lastName || ""}`.trim()
    : "Administrator";
  const now = new Date();

  // 1. Fetch and organize ordered stops
  const binsInDb = await prisma.bin.findMany({
    where: { id: { in: binIds.map(Number) } },
  });
  const binMap = new Map(binsInDb.map((b) => [b.id, b]));

  // Preserve optimized sequence from routeData.orderedStops if available, else use binIds order
  const orderedBinIds = (routeData?.orderedStops && Array.isArray(routeData.orderedStops))
    ? routeData.orderedStops.map((s) => s.id).filter((id) => binMap.has(Number(id)))
    : binIds.map(Number).filter((id) => binMap.has(id));

  // If any remaining binIds were not in orderedStops, append them
  binIds.forEach((id) => {
    const n = Number(id);
    if (!orderedBinIds.includes(n) && binMap.has(n)) {
      orderedBinIds.push(n);
    }
  });

  const formattedStops = orderedBinIds.map((id, index) => {
    const bin = binMap.get(id);
    const evalResult = evaluateBinPriority(bin.currentFillLevel, bin.status, bin.capacity);
    const stopPriority =
      priority === "AUTO" || !priority
        ? evalResult.priority
        : priority;

    return {
      id: bin.id,
      binId: bin.id,
      binCode: bin.binCode,
      address: bin.address || "Yaoundé, Cameroon",
      latitude: Number(bin.latitude),
      longitude: Number(bin.longitude),
      fillLevel: Number(bin.currentFillLevel) || 0,
      capacity: Number(bin.capacity) || 50,
      priority: stopPriority,
      stopOrder: index + 1,
      isCompleted: false,
    };
  });

  if (formattedStops.length === 0) {
    throw { status: 400, message: "No valid bins could be resolved for task creation." };
  }

  // Determine highest priority for master task
  const hasCritical = formattedStops.some((s) => s.priority === "CRITICAL");
  const hasHigh = formattedStops.some((s) => s.priority === "HIGH");
  const overallPriority =
    priority && priority !== "AUTO"
      ? priority
      : hasCritical
      ? "CRITICAL"
      : hasHigh
      ? "HIGH"
      : "NORMAL";

  const totalDistanceKm = routeData?.distanceKm != null ? Number(routeData.distanceKm) : null;
  const totalDurationMin = routeData?.durationMinutes != null ? Math.round(routeData.durationMinutes) : null;

  // Complete AI route payload
  const completeRoutePayload = {
    isAiOptimized: true,
    totalStops: formattedStops.length,
    distanceKm: totalDistanceKm,
    durationMinutes: totalDurationMin,
    geometry: routeData?.geometry || null,
    orderedStops: formattedStops,
    completedStopIds: [],
    assignedAt: now.toISOString(),
  };

  const routeString = JSON.stringify(completeRoutePayload);

  const taskNotes = notes
    ? `[AI Multi-Stop Route: ${formattedStops.length} Stops] ${notes} (Approved by ${adminName})`
    : `[AI Multi-Stop Route: ${formattedStops.length} Stops] Approved by ${adminName} on ${now.toLocaleDateString()}`;

  // Create unified collection task
  const task = await prisma.collectionTask.create({
    data: {
      binId: formattedStops[0].id,
      driverId: Number(driverId),
      truckId: truckId ? Number(truckId) : null,
      status: "ASSIGNED",
      priority: overallPriority,
      source: "AI_RECOMMENDATION",
      recommendedRoute: routeString,
      distanceKm: totalDistanceKm,
      estimatedDuration: totalDurationMin,
      assignedAt: now,
      notes: taskNotes,
    },
    include: {
      bin: true,
      driver: { select: { id: true, firstName: true, lastName: true, email: true } },
      truck: true,
    },
  });

  // Update truck status to IN_USE if it was AVAILABLE
  if (truck && truck.status === "AVAILABLE") {
    await prisma.truck.update({
      where: { id: truck.id },
      data: { status: "IN_USE" },
    });
  }

  return {
    success: true,
    message: `Successfully created AI route task with ${formattedStops.length} collection stops for ${driver.firstName} ${driver.lastName}.`,
    tasksCount: 1,
    task,
    tasks: [task],
  };
}
