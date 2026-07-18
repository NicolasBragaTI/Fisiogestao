const PERFECTPAY_CHECKOUT_URL = 'https://go.perfectpay.com.br/PPU38CQECIM';

if (PERFECTPAY_CHECKOUT_URL) {
  document.querySelectorAll('.checkout-link').forEach((link) => {
    link.href = PERFECTPAY_CHECKOUT_URL;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
  });
}
