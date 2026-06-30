export type VehicleType = 'jeep' | 'sedan' | 'pickup' | 'truck' | 'motorcycle' | 'other';
export type VehicleUse = 'tourism' | 'personal' | 'commercial' | 'work' | 'other';

export interface VehicleRead {
    id: number;
    owner_customer: number;
    brand: string;
    model: string;
    vehicle_type: VehicleType;
    vehicle_use: VehicleUse;
    engine: string;
    chassis: string;
    license_plate: string;
    year: number;
    commercial_value?: string | null;
    color: string;
    province: string;
    city: string;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

export interface VehicleWritePayload {
    owner_customer: number;
    brand: string;
    model: string;
    vehicle_type: VehicleType;
    vehicle_use: VehicleUse;
    engine: string;
    chassis: string;
    license_plate: string;
    year: number;
    commercial_value?: string;
    color: string;
    province: string;
    city: string;
}

export type VehicleUpdateRequest = VehicleWritePayload;

export type Vehiculo = VehicleRead;
export type FormVehiculo = VehicleWritePayload;
