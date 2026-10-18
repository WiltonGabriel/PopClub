import {
  evaluateStoreSchedule,
  DEFAULT_STORE_SCHEDULE,
  BusinessHourDay,
  StoreOperationalStatus,
} from "@/lib/storeSchedule";
import {
  StoreClosedException,
  ConveyorPausedException,
} from "@/domain/errors";

export class StoreScheduleDomainService {
  /**
   * Avalia as regras de horário no fuso America/Cuiaba e o interruptor da esteira.
   * Lança exceção de domínio tipada (HTTP 422) se a loja não estiver apta a receber pedidos.
   */
  public static assertCanAcceptOrders(
    businessHours?: BusinessHourDay[] | null,
    isOpen: boolean = true
  ): StoreOperationalStatus {
    const hours = businessHours && businessHours.length > 0 ? businessHours : DEFAULT_STORE_SCHEDULE;
    const evaluation = evaluateStoreSchedule(hours, isOpen);

    if (!evaluation.canAcceptOrders) {
      if (evaluation.status === "CONVEYOR_PAUSED") {
        throw new ConveyorPausedException(evaluation.openingTime, evaluation.closingTime);
      }
      throw new StoreClosedException(evaluation.openingTime, evaluation.closingTime);
    }

    return evaluation;
  }
}
