'use strict';

// Điền thông tin thật tại đây để tự động bật QR và nút sao chép.
const DONATE_CONFIG = {
  bankName: 'ACB',
  accountNumber: '23992227',
  accountHolder: 'Nguyễn Ngọc Tình',
  momoPhone: '0369861439',
  transferNote: 'HVL MCK DONATE',
  bankQrByAmount: {
    10000: 'images/10k_ACB.jpg',
    20000: 'images/20k_ACB.jpg',
    30000: 'images/30K_ACB.jpg',
  },
  momoQrByAmount: {
    10000: 'images/10k_momo.jpg',
    20000: 'images/20k-momo.jpg',
    30000: 'images/30k_momo.jpg',
  },
  serviceQrByAmount: {
    50000: {
      momo: 'images/50k_momo.jpg',
      bank: 'images/50k_ACB.jpg',
    },
    250000: {
      momo: 'images/250k_momo.jpg',
      bank: 'images/250k_ACB.jpg',
    },
  },
  contactEmail: 'nguyenngoctinh011258@gmail.com',
  zaloUrl: 'https://zalo.me/0369861439',
  facebookUrl: 'https://www.facebook.com/nguyen.tinh.754402',
};

const AMOUNT_NOTES = {
  10000: {
    title: 'Một lời cảm ơn',
    desc: 'Góp một phần nhỏ vào chi phí duy trì dự án — số tiền không quan trọng bằng tấm lòng bạn dành cho HVL-MCK.',
  },
  20000: {
    title: 'Một ly cà phê',
    desc: 'Tiếp thêm năng lượng để duy trì máy chủ, tên miền và tiếp tục hoàn thiện HVL-MCK mỗi ngày.',
  },
  30000: {
    title: 'Tiếp sức dự án',
    desc: 'Hỗ trợ bảo trì hệ thống, tối ưu trải nghiệm nghe nhạc và phát triển thêm tính năng mới trong thời gian tới.',
  },
};

const serviceButtons = Array.from(document.querySelectorAll('.service-option'));
const amountButtons = Array.from(document.querySelectorAll('.amount-option'));
const selectedAmountEl = document.getElementById('selected-amount');
const amountNoteTitle = document.getElementById('amount-note-title');
const amountNoteDesc = document.getElementById('amount-note-desc');
const selectedServiceName = document.getElementById('selected-service-name');
const selectedServicePrice = document.getElementById('selected-service-price');
const serviceOrderSection = document.getElementById('service-order-section');
const contactDonate = document.getElementById('contact-donate');
const copyAccount = document.getElementById('copy-account');
const toast = document.getElementById('donate-toast');
const paymentTabs = Array.from(document.querySelectorAll('.payment-tab'));
const paymentPanels = Array.from(document.querySelectorAll('.payment-method-panel'));
const momoQr = document.getElementById('momo-qr');
const momoPlaceholder = document.getElementById('momo-placeholder');
const downloadMomoQr = document.getElementById('download-momo-qr');
const bankQr = document.getElementById('donate-qr');
const bankPlaceholder = document.getElementById('qr-placeholder');
const downloadBankQr = document.getElementById('download-bank-qr');
const copyServiceMomoPhone = document.getElementById('copy-service-momo-phone');
const selectedPlanBenefit = document.getElementById('selected-plan-benefit');
const codingButtons = Array.from(document.querySelectorAll('.coding-option'));
const codingContactSection = document.getElementById('coding-contact-section');
const selectedCodingName = document.getElementById('selected-coding-name');
const contactCodingEmail = document.getElementById('contact-coding-email');

let selectedDonateAmount = 20000;
let selectedService = null;
let selectedCoding = null;
let paymentMode = 'donate';
let toastTimer = null;

function formatVnd(value) {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(value || 0);
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

function transferNoteForCurrentChoice() {
  if (paymentMode !== 'service' || !selectedService) return DONATE_CONFIG.transferNote;
  return `HVL ${selectedService.code}`;
}

function updateMomoDetails() {
  const amount = selectedDonateAmount;
  const qrSrc = DONATE_CONFIG.momoQrByAmount[amount];

  document.getElementById('momo-amount').textContent = formatVnd(amount);
  document.getElementById('momo-choice').textContent = 'Ủng hộ trực tiếp cho dự án';
  document.getElementById('momo-note').textContent = DONATE_CONFIG.transferNote;

  if (qrSrc) {
    momoQr.src = qrSrc;
    momoQr.alt = `Mã QR MoMo cho gói ${formatVnd(amount)}`;
    momoQr.hidden = false;
    momoPlaceholder.hidden = true;
    downloadMomoQr.href = qrSrc;
    downloadMomoQr.download = `HVL-MoMo-${amount}.jpg`;
    downloadMomoQr.hidden = false;
  }
}

function updateBankDetails() {
  const amount = selectedDonateAmount;
  const qrSrc = DONATE_CONFIG.bankQrByAmount[amount];

  if (qrSrc) {
    bankQr.src = qrSrc;
    bankQr.alt = `Mã QR ngân hàng ACB cho gói ${formatVnd(amount)}`;
    bankQr.hidden = false;
    bankPlaceholder.hidden = true;
    downloadBankQr.href = qrSrc;
    downloadBankQr.download = `HVL-ACB-${amount}.jpg`;
    downloadBankQr.hidden = false;
  }
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
    lines.push('', 'Bạn gửi giúp mình thông tin để hoàn tất donate nhé.');
  }

  contactDonate.href = `mailto:${DONATE_CONFIG.contactEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(lines.join('\n'))}`;
}

function updateDirectPayment() {
  updateMomoDetails();
  updateBankDetails();
}

function updateServicePayment() {
  if (!selectedService) return;
  const price = formatVnd(selectedService.price);
  const qrImages = DONATE_CONFIG.serviceQrByAmount[selectedService.price];
  document.getElementById('service-momo-price').textContent = price;
  document.getElementById('service-bank-price').textContent = price;
  document.getElementById('service-momo-caption').textContent = price;
  document.getElementById('service-bank-caption').textContent = price;

  if (qrImages) {
    const serviceMomoQr = document.getElementById('service-momo-qr');
    const serviceBankQr = document.getElementById('service-bank-qr');
    const downloadServiceMomoQr = document.getElementById('download-service-momo-qr');
    const downloadServiceBankQr = document.getElementById('download-service-bank-qr');
    serviceMomoQr.src = qrImages.momo;
    serviceMomoQr.alt = `Mã QR MoMo thanh toán ${selectedService.title} với giá ${price}`;
    serviceBankQr.src = qrImages.bank;
    serviceBankQr.alt = `Mã QR ACB thanh toán ${selectedService.title} với giá ${price}`;
    downloadServiceMomoQr.href = qrImages.momo;
    downloadServiceMomoQr.download = `HVL-MoMo-${selectedService.price}.jpg`;
    downloadServiceBankQr.href = qrImages.bank;
    downloadServiceBankQr.download = `HVL-ACB-${selectedService.price}.jpg`;
  }
  const benefitTitle = selectedPlanBenefit.querySelector('strong');
  const benefitText = selectedPlanBenefit.querySelector('span');
  if (selectedService.id === 'family') {
    benefitTitle.textContent = 'Chủ nhóm gia đình';
    benefitText.textContent = 'Bạn là quản lý gói và có thể mời thêm tối đa 5 thành viên trong 1 năm.';
  } else {
    benefitTitle.textContent = 'Tài khoản chính chủ';
    benefitText.textContent = 'Nâng cấp trực tiếp trên Gmail của bạn trong thời hạn 1 năm.';
  }
}

function selectService(button) {
  const nextService = serviceFromButton(button);
  const isCurrentService = selectedService && selectedService.id === nextService.id;

  if (isCurrentService) {
    selectedService = null;
    paymentMode = 'donate';
    serviceOrderSection.hidden = true;
    serviceButtons.forEach(item => {
      item.classList.remove('active');
      item.setAttribute('aria-pressed', 'false');
    });
    updateContactLink();
    return;
  }

  selectedService = nextService;
  paymentMode = 'service';
  serviceOrderSection.hidden = false;
  serviceButtons.forEach(item => {
    const active = item === button;
    item.classList.toggle('active', active);
    item.setAttribute('aria-pressed', String(active));
  });
  selectedServiceName.textContent = selectedService.title;
  selectedServicePrice.textContent = formatVnd(selectedService.price);
  updateServicePayment();
  updateContactLink();
}

function codingFromButton(button) {
  if (!button) return null;
  return { id: button.dataset.coding, title: button.dataset.title };
}

function updateCodingContactLink() {
  if (!selectedCoding) return;
  const subject = `Yêu cầu dịch vụ coding — ${selectedCoding.title}`;
  const lines = [
    'Chào Twot,',
    '',
    `Mình quan tâm dịch vụ: ${selectedCoding.title}.`,
    'Mô tả yêu cầu: ',
    'Đường dẫn tham khảo (nếu có): ',
    'Thời gian mong muốn: ',
    '',
    'Bạn báo giúp mình phương án và thời gian nhé.',
  ];
  contactCodingEmail.href = `mailto:${DONATE_CONFIG.contactEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(lines.join('\n'))}`;
}

function selectCoding(button) {
  const nextCoding = codingFromButton(button);
  const isCurrentCoding = selectedCoding && selectedCoding.id === nextCoding.id;

  if (isCurrentCoding) {
    selectedCoding = null;
    codingContactSection.hidden = true;
    codingButtons.forEach(item => {
      item.classList.remove('active');
      item.setAttribute('aria-pressed', 'false');
    });
    return;
  }

  selectedCoding = nextCoding;
  codingContactSection.hidden = false;
  codingButtons.forEach(item => {
    const active = item === button;
    item.classList.toggle('active', active);
    item.setAttribute('aria-pressed', String(active));
  });
  selectedCodingName.textContent = selectedCoding.title;
  updateCodingContactLink();
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
  const note = AMOUNT_NOTES[selectedDonateAmount];
  if (note) {
    amountNoteTitle.textContent = note.title;
    amountNoteDesc.textContent = note.desc;
  }
  updateDirectPayment();
  updateContactLink();
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
    status.lastChild.textContent = ' Tài khoản ACB đã sẵn sàng';
    copyAccount.disabled = false;
  }
}

serviceButtons.forEach(button => button.addEventListener('click', () => selectService(button)));
codingButtons.forEach(button => button.addEventListener('click', () => selectCoding(button)));

amountButtons.forEach(button => {
  button.addEventListener('click', () => {
    setDonateAmount(button.dataset.amount, button);
  });
});

copyAccount.addEventListener('click', () => {
  if (DONATE_CONFIG.accountNumber) copyText(DONATE_CONFIG.accountNumber, 'Đã sao chép số tài khoản');
});

copyServiceMomoPhone.addEventListener('click', () => {
  copyText(DONATE_CONFIG.momoPhone, 'Đã sao chép số điện thoại MoMo');
});

document.querySelectorAll('[data-copy-target]').forEach(button => {
  button.addEventListener('click', () => {
    const target = document.getElementById(button.dataset.copyTarget);
    if (target) copyText(target.textContent.trim(), `Đã sao chép ${target.textContent.trim()}`);
  });
});

paymentTabs.forEach(tab => {
  tab.addEventListener('click', () => {
    const method = tab.dataset.method;
    paymentTabs.forEach(item => {
      const active = item === tab;
      item.classList.toggle('active', active);
      item.setAttribute('aria-selected', String(active));
      item.tabIndex = active ? 0 : -1;
    });
    paymentPanels.forEach(panel => { panel.hidden = panel.id !== `${method}-panel`; });
  });
  tab.addEventListener('keydown', event => {
    if (!['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
    event.preventDefault();
    const currentIndex = paymentTabs.indexOf(tab);
    const direction = event.key === 'ArrowRight' ? 1 : -1;
    const nextTab = paymentTabs[(currentIndex + direction + paymentTabs.length) % paymentTabs.length];
    nextTab.click();
    nextTab.focus();
  });
});

document.querySelectorAll('.contact-btn').forEach(link => {
  if (link.classList.contains('zalo')) link.href = DONATE_CONFIG.zaloUrl;
  if (link.classList.contains('facebook')) link.href = DONATE_CONFIG.facebookUrl;
});

document.getElementById('donate-year').textContent = new Date().getFullYear();
initPaymentDetails();
setDonateAmount(selectedDonateAmount, amountButtons.find(button => Number(button.dataset.amount) === selectedDonateAmount));

if ('serviceWorker' in navigator && location.protocol.indexOf('http') === 0) {
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
}
