import '../../domain/entities/truck_entity.dart';

class TruckModel extends TruckEntity {
  const TruckModel({
    required super.id,
    required super.capacity,
    required super.status,
  });

  factory TruckModel.fromMap(Map<String, dynamic> map, String id) {
    return TruckModel(
      id: id,
      capacity: map['capacity'] ?? '',
      status: map['status'] ?? '',
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'capacity': capacity,
      'status': status,
    };
  }
}
