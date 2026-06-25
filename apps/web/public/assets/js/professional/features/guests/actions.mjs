export function createGuestActions() {
  return Object.freeze({
    openReservation(entry) {
      return entry?.reservationId || '';
    },
    printReservation(entry) {
      return entry?.reservationId || '';
    }
  });
}
