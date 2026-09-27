// 领域事件：存档层只追加事件，状态由事件折叠而来

import type {
  ClaimAction,
  HoofPosition,
  InspectionAction,
  IssueKind,
  ReturnCode,
} from "./types";

export interface FittingRegisteredEvent {
  type: "FittingRegistered";
  id: string;
  at: string;
  horseNo: string;
  pieceNo: string;
  position: HoofPosition;
  fittedAt: string;
  warrantyUntil: string;
  note?: string;
}

export interface StockReceivedEvent {
  type: "StockReceived";
  id: string;
  at: string;
  pieceNo: string;
  count: number;
}

export interface AppealReturnedEvent {
  type: "AppealReturned";
  id: string;
  at: string;
  pieceNo: string;
  horseNo: string;
  position?: HoofPosition;
  issue: IssueKind;
  reason: ReturnCode;
}

export interface ClaimOpenedEvent {
  type: "ClaimOpened";
  id: string;
  at: string;
  pieceNo: string;
  horseNo: string;
  position: HoofPosition;
  fittingId: string;
  issue: IssueKind;
  warrantyUntil: string;
}

export interface ClaimHandledEvent {
  type: "ClaimHandled";
  id: string;
  at: string;
  claimId: string;
  action: ClaimAction;
  note?: string;
}

export interface PieceDeactivatedEvent {
  type: "PieceDeactivated";
  id: string;
  at: string;
  pieceNo: string;
  reason: string;
}

export interface StockSealedEvent {
  type: "StockSealed";
  id: string;
  at: string;
  pieceNo: string;
}

export interface InspectionOpenedEvent {
  type: "InspectionOpened";
  id: string;
  at: string;
  pieceNo: string;
  horseNo: string;
  position: HoofPosition;
  fittingId: string;
}

export interface InspectionCompletedEvent {
  type: "InspectionCompleted";
  id: string;
  at: string;
  entryId: string;
  action: InspectionAction;
  note?: string;
}

export type DomainEvent =
  | FittingRegisteredEvent
  | StockReceivedEvent
  | AppealReturnedEvent
  | ClaimOpenedEvent
  | ClaimHandledEvent
  | PieceDeactivatedEvent
  | StockSealedEvent
  | InspectionOpenedEvent
  | InspectionCompletedEvent;
