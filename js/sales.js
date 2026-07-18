const PERFECTPAY_MONTHLY_CHECKOUT_URL = 'https://go.perfectpay.com.br/PPU38CQECIM';
const PERFECTPAY_ANNUAL_CHECKOUT_URL = 'https://go.perfectpay.com.br/PPU38CQEDL8';

const connectCheckout = (selector, url) => {
  if (!url) return;

  document.querySelectorAll(selector).forEach((link) => {
    link.href = url;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
  });
};

connectCheckout('.checkout-monthly', PERFECTPAY_MONTHLY_CHECKOUT_URL);
connectCheckout('.checkout-annual', PERFECTPAY_ANNUAL_CHECKOUT_URL);
