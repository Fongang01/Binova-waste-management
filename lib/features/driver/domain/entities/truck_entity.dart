import 'package:equatable/equatable.dart';

class TruckEntity extends Equatable {
  final String id;
  final String capacity;
  final String status;

  const TruckEntity({
    required this.id,
    required this.capacity,
    required this.status,
  });

  @override
  List<Object?> get props => [id, capacity, status];
}
