// Cole aqui o link do checkout liberado pela Perfect Pay.
const PERFECTPAY_CHECKOUT_URL = '';

if (PERFECTPAY_CHECKOUT_URL) {
  document.querySelectorAll('.checkout-link').forEach((link) => {
    link.href = PERFECTPAY_CHECKOUT_URL;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
  });
}
