// Источник истины схемы данных. Координаты геометрии — GeoJSON [lng, lat].

export type ParcelStatus =
  | "clean"
  | "check"
  | "detected"
  | "in_progress"
  | "resolved"
  | "returned";

export type ViolationType = "unused" | "seizure" | "dump";

export type SignalStatus =
  | "new"
  | "checking"
  | "confirmed"
  | "rejected"
  | "resolved";

export type ApplicationStage = "review" | "inspection" | "approved" | "rejected";

export type ProcedureId = "izhs" | "purpose_change" | "lease_extension";

export interface HistoryEntry {
  at: string; // ISO 8601
  action: string;
  comment?: string;
}

export interface PolygonGeometry {
  type: "Polygon";
  coordinates: [number, number][][]; // [lng, lat]
}

export interface Parcel {
  id: string;
  cadastralNumber: string;
  purpose: string;
  areaHa: number;
  address: string;
  geometry: PolygonGeometry;
  status: ParcelStatus;
  violationType?: ViolationType;
  deadline?: string; // ISO 8601
  photos: string[];
  history: HistoryEntry[];
  isTest?: boolean;
}

export interface Signal {
  id: string;
  chatId: number;
  lat: number;
  lng: number;
  text: string;
  parcelId?: string;
  status: SignalStatus;
  createdAt: string;
  photoFileId?: string;
  inspectorNote?: string;
  isDemoSeed?: boolean;
  /** Сколько жителей сообщили об этом месте (по умолчанию 1). */
  reports?: number;
  /** chatId жителей, присоединившихся к сигналу (кроме автора). Не отдаётся в панель. */
  subscribers?: number[];
  /** Все фото сигнала (по умолчанию — [photoFileId]). */
  photoFileIds?: string[];
  /** Источник: житель через бот или отметка инспектора по спутниковым снимкам. Нет поля = "citizen". */
  source?: SignalSource;
}

export type SignalSource = "citizen" | "satellite";

export interface Application {
  trackNumber: string;
  procedure: ProcedureId;
  stage: ApplicationStage;
  stageNote: string;
  updatedAt: string;
}

/** Signal без персональных данных жителя — то, что уходит в панель. */
export type PublicSignal = Omit<Signal, "chatId" | "subscribers">;

export interface StateResponse {
  parcels: Parcel[];
  signals: PublicSignal[];
  apps: Application[];
  serverTime: string;
}

export interface SeedFile {
  parcels: Parcel[];
  applications: Application[];
  signals: Signal[];
}
