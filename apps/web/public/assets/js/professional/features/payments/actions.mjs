export function createPaymentActions() {
  return Object.freeze({
    setMethodFilter(filters = {}, method = 'all') {
      return { ...filters, method };
    },
    setSearchFilter(filters = {}, search = '') {
      return { ...filters, search };
    }
  });
}
