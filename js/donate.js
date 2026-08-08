'use strict';

// Điền thông tin thật tại đây để tự động bật QR và nút sao chép.
const DONATE_CONFIG = {
  bankName: '',
  accountNumber: '',
  accountHolder: 'TWOT',
  transferNote: 'HVL MCK DONATE',
  qrImage: '', // Ví dụ: 'images/donate-qr.png'
  contactEmail: 'nguyenngoctinh011258@gmail.com',
};

const amountButtons = Array.from(document.querySelectorAll('.amount-option'));
const customAmount = document.getElementById('custom-amount');
const donateMessage = document.getElementById('donate-message');
const selectedAmountEl = document.getElementById('selected-amount');
const contactDonate = document.getElementById('contact-donate');
const copyAccount = document.getElementById('copy-account');
const toast = document.getElementById('donate-toast');

let selectedAmount = 50000;
let toastTimer = null;

function formatVnd(value) {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(value || 0);
}

function digitsOnly(value) {
  return value.replace(/\D/g, '').slice(0, 10);
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 2400);
}

function updateContactLink() {
  const subject = 'Ủng hộ HVL-MCK';
  const lines = [
    'Chào Twot,',
    '',
    `Mình muốn ủng hộ HVL-MCK với số tiền: ${formatVnd(selectedAmount)}.`,
  ];
  const message = donateMessage.value.trim();
  if (message) lines.push('', `Lời nhắn: ${message}`);
  lines.push('', 'Bạn gửi giúp mình thông tin để hoàn tất donate nhé.');
  contactDonate.href = `mailto:${DONATE_CONFIG.contactEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(lines.join('\n'))}`;
}

function setAmount(amount, sourceButton) {
  selectedAmount = Math.max(0, Number(amount) || 0);
  amountButtons.forEach(button => {
    const active = button === sourceButton;
    button.classList.toggle('active', active);
    button.setAttribute('aria-pressed', String(active));
  });
  selectedAmountEl.textContent = formatVnd(selectedAmount);
  updateContactLink();
}

function initPaymentDetails() {
  const configured = Boolean(DONATE_CONFIG.bankName && DONATE_CONFIG.accountNumber);
  document.getElementById('bank-name').textContent = DONATE_CONFIG.bankName || 'Đang cập nhật';
  document.getElementById('bank-account').textContent = DONATE_CONFIG.accountNumber || 'Đang cập nhật';
  document.getElementById('bank-holder').textContent = DONATE_CONFIG.accountHolder || 'TWOT';
  document.getElementById('transfer-note').textContent = DONATE_CONFIG.transferNote;

  if (configured) {
    const status = document.getElementById('config-status');
    status.classList.add('ready');
    status.lastChild.textContent = ' Sẵn sàng nhận donate';
    copyAccount.disabled = false;
  }

  if (configured && DONATE_CONFIG.qrImage) {
    const qr = document.getElementById('donate-qr');
    qr.src = DONATE_CONFIG.qrImage;
    qr.hidden = false;
    document.getElementById('qr-placeholder').hidden = true;
  }
}

amountButtons.forEach(button => {
  button.addEventListener('click', () => {
    customAmount.value = '';
    setAmount(button.dataset.amount, button);
  });
});

customAmount.addEventListener('input', () => {
  const digits = digitsOnly(customAmount.value);
  customAmount.value = digits ? new Intl.NumberFormat('vi-VN').format(Number(digits)) : '';
  setAmount(digits, null);
});

donateMessage.addEventListener('input', updateContactLink);

copyAccount.addEventListener('click', async () => {
  if (!DONATE_CONFIG.accountNumber) return;
  try {
    await navigator.clipboard.writeText(DONATE_CONFIG.accountNumber);
    showToast('Đã sao chép số tài khoản');
  } catch (error) {
    showToast('Không thể sao chép tự động');
  }
});

document.getElementById('donate-year').textContent = new Date().getFullYear();
initPaymentDetails();
updateContactLink();

if ('serviceWorker' in navigator && location.protocol.indexOf('http') === 0) {
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
}
