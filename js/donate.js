'use strict';

// Điền thông tin thật tại đây để tự động bật QR và nút sao chép.
const DONATE_CONFIG = {
  bankName: '',
  accountNumber: '',
  accountHolder: 'TWOT',
  transferNote: 'HVL MCK DONATE',
  qrImage: '', // Ví dụ: 'images/donate-qr.png'
  contactEmail: 'nguyenngoctinh011258@gmail.com',
  zaloUrl: 'https://zalo.me/0369861439',
  facebookUrl: 'https://www.facebook.com/nguyen.tinh.754402',
};

const serviceButtons = Array.from(document.querySelectorAll('.service-option'));
const amountButtons = Array.from(document.querySelectorAll('.amount-option'));
const customAmount = document.getElementById('custom-amount');
const donateMessage = document.getElementById('donate-message');
const customerEmail = document.getElementById('customer-email');
const selectedAmountEl = document.getElementById('selected-amount');
const selectedServiceName = document.getElementById('selected-service-name');
const selectedServicePrice = document.getElementById('selected-service-price');
const transferNoteEl = document.getElementById('transfer-note');
const contactDonate = document.getElementById('contact-donate');
const copyAccount = document.getElementById('copy-account');
const copyOrder = document.getElementById('copy-order');
const toast = document.getElementById('donate-toast');

let selectedDonateAmount = 50000;
let selectedService = serviceFromButton(serviceButtons[0]);
let paymentMode = 'service';
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

function serviceFromButton(button) {
  if (!button) return null;
  return {
    id: button.dataset.service,
    title: button.dataset.title,
    price: Number(button.dataset.price),
    code: button.dataset.code,
  };
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 2400);
}

function emailIsValid() {
  return /^[^\s@]+@gmail\.com$/i.test(customerEmail.value.trim());
}

function transferNoteForCurrentChoice() {
  if (paymentMode !== 'service' || !selectedService) return DONATE_CONFIG.transferNote;
  const username = customerEmail.value.trim().split('@')[0].replace(/[^a-z0-9]/gi, '').toUpperCase();
  return `HVL ${selectedService.code} ${username || 'GMAIL'}`;
}

function updateTransferNote() {
  transferNoteEl.textContent = transferNoteForCurrentChoice();
}

function updateContactLink() {
  let subject;
  let lines;

  if (paymentMode === 'service' && selectedService) {
    subject = `Đăng ký ${selectedService.title}`;
    lines = [
      'Chào Twot,',
      '',
      `Mình muốn đăng ký: ${selectedService.title}.`,
      `Giá ưu đãi: ${formatVnd(selectedService.price)}.`,
      `Gmail cần nâng cấp: ${customerEmail.value.trim() || '[chưa nhập]'}.`,
      `Nội dung chuyển khoản: ${transferNoteForCurrentChoice()}.`,
      '',
      'Mình sẽ gửi minh chứng giao dịch để bạn xác nhận.',
    ];
  } else {
    subject = 'Ủng hộ HVL-MCK';
    lines = [
      'Chào Twot,',
      '',
      `Mình muốn ủng hộ HVL-MCK với số tiền: ${formatVnd(selectedDonateAmount)}.`,
    ];
    const message = donateMessage.value.trim();
    if (message) lines.push('', `Lời nhắn: ${message}`);
    lines.push('', 'Bạn gửi giúp mình thông tin để hoàn tất donate nhé.');
  }

  contactDonate.href = `mailto:${DONATE_CONFIG.contactEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(lines.join('\n'))}`;
}

function updateChoiceContext() {
  updateTransferNote();
  updateContactLink();
}

function selectService(button) {
  selectedService = serviceFromButton(button);
  paymentMode = 'service';
  serviceButtons.forEach(item => {
    const active = item === button;
    item.classList.toggle('active', active);
    item.setAttribute('aria-pressed', String(active));
  });
  selectedServiceName.textContent = selectedService.title;
  selectedServicePrice.textContent = formatVnd(selectedService.price);
  updateChoiceContext();
}

function setDonateAmount(amount, sourceButton) {
  paymentMode = 'donate';
  selectedDonateAmount = Math.max(0, Number(amount) || 0);
  amountButtons.forEach(button => {
    const active = button === sourceButton;
    button.classList.toggle('active', active);
    button.setAttribute('aria-pressed', String(active));
  });
  selectedAmountEl.textContent = formatVnd(selectedDonateAmount);
  updateChoiceContext();
}

function buildOrderMessage() {
  return [
    'ĐĂNG KÝ DỊCH VỤ HVL',
    `Dịch vụ: ${selectedService.title}`,
    `Giá ưu đãi: ${formatVnd(selectedService.price)}`,
    `Gmail cần nâng cấp: ${customerEmail.value.trim()}`,
    `Nội dung chuyển khoản: ${transferNoteForCurrentChoice()}`,
    '',
    'Mình đã đọc lưu ý bảo mật và sẽ không cung cấp mật khẩu hoặc OTP.',
  ].join('\n');
}

async function copyText(text, successMessage) {
  try {
    await navigator.clipboard.writeText(text);
    showToast(successMessage);
    return true;
  } catch (error) {
    showToast('Không thể sao chép tự động');
    return false;
  }
}

function initPaymentDetails() {
  const configured = Boolean(DONATE_CONFIG.bankName && DONATE_CONFIG.accountNumber);
  document.getElementById('bank-name').textContent = DONATE_CONFIG.bankName || 'Đang cập nhật';
  document.getElementById('bank-account').textContent = DONATE_CONFIG.accountNumber || 'Đang cập nhật';
  document.getElementById('bank-holder').textContent = DONATE_CONFIG.accountHolder || 'TWOT';

  if (configured) {
    const status = document.getElementById('config-status');
    status.classList.add('ready');
    status.lastChild.textContent = ' Sẵn sàng nhận chuyển khoản';
    copyAccount.disabled = false;
  }

  if (configured && DONATE_CONFIG.qrImage) {
    const qr = document.getElementById('donate-qr');
    qr.src = DONATE_CONFIG.qrImage;
    qr.hidden = false;
    document.getElementById('qr-placeholder').hidden = true;
  }
}

serviceButtons.forEach(button => button.addEventListener('click', () => selectService(button)));

amountButtons.forEach(button => {
  button.addEventListener('click', () => {
    customAmount.value = '';
    setDonateAmount(button.dataset.amount, button);
  });
});

customAmount.addEventListener('input', () => {
  const digits = digitsOnly(customAmount.value);
  customAmount.value = digits ? new Intl.NumberFormat('vi-VN').format(Number(digits)) : '';
  setDonateAmount(digits, null);
});

customerEmail.addEventListener('input', () => {
  paymentMode = 'service';
  customerEmail.setAttribute('aria-invalid', String(Boolean(customerEmail.value) && !emailIsValid()));
  updateChoiceContext();
});

donateMessage.addEventListener('input', () => {
  paymentMode = 'donate';
  updateChoiceContext();
});

copyOrder.addEventListener('click', () => {
  paymentMode = 'service';
  updateChoiceContext();
  if (!emailIsValid()) {
    customerEmail.setAttribute('aria-invalid', 'true');
    customerEmail.focus();
    showToast('Hãy nhập đúng địa chỉ Gmail cần nâng cấp');
    return;
  }
  copyText(buildOrderMessage(), 'Đã sao chép nội dung đơn hàng');
});

copyAccount.addEventListener('click', () => {
  if (DONATE_CONFIG.accountNumber) copyText(DONATE_CONFIG.accountNumber, 'Đã sao chép số tài khoản');
});

document.querySelectorAll('.contact-btn').forEach(link => {
  if (link.classList.contains('zalo')) link.href = DONATE_CONFIG.zaloUrl;
  if (link.classList.contains('facebook')) link.href = DONATE_CONFIG.facebookUrl;
});

document.getElementById('donate-year').textContent = new Date().getFullYear();
initPaymentDetails();
selectService(serviceButtons[0]);

if ('serviceWorker' in navigator && location.protocol.indexOf('http') === 0) {
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
}
