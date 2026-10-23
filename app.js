'use strict';

const BARBERS = [
  { id: 'rafael', name: 'Rafael Costa', specialty: 'Clássicos & tesoura', years: '8 anos de experiência', rating: '4,9', photo: 'assets/rafael.jpg' },
  { id: 'lucas', name: 'Lucas Almeida', specialty: 'Degradê & estilo', years: '6 anos de experiência', rating: '4,9', photo: 'assets/lucas.jpg' },
  { id: 'bruno', name: 'Bruno Santos', specialty: 'Barba & navalha', years: '7 anos de experiência', rating: '5,0', photo: 'assets/bruno.jpg' }
];
const SERVICES = [
  { id: 'corte', name: 'Corte de cabelo', description: 'Na tesoura ou máquina, do seu jeito.', price: 45, duration: 30 },
  { id: 'barba', name: 'Barba completa', description: 'Desenho, toalha quente e finalização.', price: 35, duration: 30 },
  { id: 'combo', name: 'Corte + barba', description: 'O cuidado completo para renovar o visual.', price: 70, duration: 60 },
  { id: 'completo', name: 'Experiência GS RISE', description: 'Corte, barba e cuidado com as sobrancelhas.', price: 85, duration: 90 }
];
// Mantém as reservas já salvas antes da atualização da marca.
const STORAGE_KEY = 'oficio.bookings.v1';
const panel = document.querySelector('#step-panel');
const nextButton = document.querySelector('#next-button');
const backButton = document.querySelector('#back-button');
const errorBox = document.querySelector('#form-error');
const state = { step: 0, barber: null, service: null, date: null, time: null, week: 0, customer: { name: '', phone: '', email: '' } };
let lastBooking = null;
let cancelId = null;
let storageReadable = true;

function escapeHTML(value) { return String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char])); }
function localDate(date) { return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`; }
function dateFromKey(key) { return new Date(`${key}T12:00:00`); }
function today() { const date = new Date(); date.setHours(0, 0, 0, 0); return date; }
function dayAt(offset) { const date = today(); date.setDate(date.getDate() + offset); return date; }
function money(value) { return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }); }
function minutes(time) { const [h, m] = time.split(':').map(Number); return h * 60 + m; }
function shortDate(key) { return dateFromKey(key).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }).replace('.', ''); }
function fullDate(key) { return dateFromKey(key).toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' }); }
function getBarber(id = state.barber) { return BARBERS.find(barber => barber.id === id); }
function getService(id = state.service) { return SERVICES.find(service => service.id === id); }
function readBookings() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    storageReadable = Array.isArray(parsed);
    if (!storageReadable) return [];
    return parsed.filter(item => item && typeof item.id === 'string' && getBarber(item.barber) && getService(item.service) && /^\d{4}-\d{2}-\d{2}$/.test(item.date) && /^\d{2}:\d{2}$/.test(item.time) && ['active', 'cancelled'].includes(item.status));
  } catch { storageReadable = false; return []; }
}
function writeBookings(bookings) {
  if (!storageReadable) throw new Error('Armazenamento indisponível');
  localStorage.setItem(STORAGE_KEY, JSON.stringify(bookings));
  updateCount();
}
function availableTime(time, date = state.date, barber = state.barber, service = state.service) {
  if (typeof time !== 'string' || !date || !barber || !service || dateFromKey(date).getDay() === 0) return false;
  const start = new Date(`${date}T${time}:00`);
  const duration = getService(service).duration;
  if (start <= new Date() || minutes(time) < 540 || minutes(time) + duration > 1140) return false;
  return !readBookings().some(booking => booking.status === 'active' && booking.barber === barber && booking.date === date && minutes(time) < minutes(booking.time) + getService(booking.service).duration && minutes(time) + duration > minutes(booking.time));
}
function showError(message) { errorBox.textContent = message; errorBox.hidden = false; }
function clearError() { errorBox.hidden = true; errorBox.textContent = ''; }
function heading(title, subtitle, extra = '') { return `<div class="panel-heading"><div><h3 tabindex="-1">${title}</h3><p>${subtitle}</p></div>${extra}</div>`; }
function renderBarbers() {
  return heading('Quem vai cuidar do seu visual?', 'Escolha o profissional que combina com você.', '<span class="panel-badge">3 profissionais</span>') + `<div class="barbers" role="group" aria-label="Escolha seu barbeiro">${BARBERS.map(barber => `<button class="barber-card ${state.barber === barber.id ? 'selected' : ''}" data-barber="${barber.id}" aria-pressed="${state.barber === barber.id}" aria-label="Selecionar ${barber.name}, ${barber.specialty}"><div class="barber-photo"><img src="${barber.photo}" alt="${barber.name}" width="400" height="450"><span class="selection-circle" aria-hidden="true">✓</span></div><div class="barber-copy"><h4>${barber.name}</h4><p>${barber.specialty}</p><div class="barber-meta"><span>${barber.years}</span><strong>${barber.rating}</strong></div></div></button>`).join('')}</div>`;
}
function renderServices() {
  return heading('Qual vai ser o cuidado de hoje?', 'Um trato no visual, do seu jeito.') + `<div class="service-list" role="group" aria-label="Serviços">${SERVICES.map(service => `<button class="service-option ${state.service === service.id ? 'selected' : ''}" data-service="${service.id}" aria-pressed="${state.service === service.id}"><span class="service-radio" aria-hidden="true"></span><span><span class="service-name">${service.name}</span><span class="service-description">${service.description}</span></span><strong class="service-price">${money(service.price)}<small>${service.duration} minutos</small></strong></button>`).join('')}</div>`;
}
function renderDates() {
  const first = dayAt(state.week * 7);
  const last = dayAt(state.week * 7 + 6);
  const month = first.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  const otherMonth = first.getMonth() !== last.getMonth() ? ` / ${last.toLocaleDateString('pt-BR', { month: 'long' })}` : '';
  const dates = Array.from({ length: 7 }, (_, i) => {
    const date = dayAt(state.week * 7 + i);
    const key = localDate(date);
    const closed = date.getDay() === 0;
    return `<button class="date-button ${state.date === key ? 'selected' : ''}" data-date="${key}" aria-pressed="${state.date === key}" aria-label="${fullDate(key)}${closed ? ', fechado' : ''}" ${closed ? 'disabled' : ''}><span>${date.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '')}</span><strong>${date.getDate()}</strong></button>`;
  }).join('');
  const slots = Array.from({ length: 20 }, (_, i) => `${String(9 + Math.floor(i / 2)).padStart(2, '0')}:${i % 2 ? '30' : '00'}`);
  const openSlots = state.date ? slots.filter(time => availableTime(time)).length : 0;
  return heading('Um horário que encaixa no seu dia.', 'Atendemos de segunda a sábado, das 9h às 19h.') + `<div class="calendar-navigation"><strong>${month}${otherMonth}</strong><div class="calendar-arrows"><button class="icon-button" data-week="-1" aria-label="Semana anterior" ${state.week === 0 ? 'disabled' : ''}>←</button><button class="icon-button" data-week="1" aria-label="Próxima semana" ${state.week === 8 ? 'disabled' : ''}>→</button></div></div><div class="date-grid" role="group" aria-label="Escolha a data">${dates}</div><p class="time-label">${state.date ? `Horários para ${shortDate(state.date)}` : 'Escolha uma data para ver os horários'}</p><div class="time-grid" role="group" aria-label="Escolha o horário">${state.date ? slots.map(time => `<button class="time-button ${state.time === time ? 'selected' : ''}" data-time="${time}" aria-pressed="${state.time === time}" ${availableTime(time) ? '' : 'disabled'}>${time}</button>`).join('') : ''}</div><p class="availability-note">${state.date && !openSlots ? 'Sem horários disponíveis neste dia. Experimente outra data.' : 'Horários riscados não estão disponíveis. Domingos: fechado.'}</p>`;
}
function renderCustomer() {
  return heading('Só falta a gente se conhecer.', 'Preencha seus dados para salvar sua reserva.') + `<form id="customer-form" class="customer-form"><label class="form-field">Seu nome<input name="name" autocomplete="name" placeholder="Como podemos te chamar?" required minlength="2" maxlength="80" value="${escapeHTML(state.customer.name)}"></label><div class="form-row"><label class="form-field">Celular<input name="phone" type="tel" autocomplete="tel" inputmode="tel" placeholder="(11) 99999-9999" required maxlength="16" pattern="[()0-9 +\\-]{10,16}" value="${escapeHTML(state.customer.phone)}"><span class="form-hint">Informe o número com DDD.</span></label><label class="form-field"><span>E-mail <small class="form-hint">(opcional)</small></span><input name="email" type="email" autocomplete="email" placeholder="voce@exemplo.com" maxlength="120" value="${escapeHTML(state.customer.email)}"></label></div><p class="privacy-note">Seus dados serão usados apenas para esta reserva e ficarão armazenados neste navegador. Confira o resumo antes de concluir.</p></form>`;
}
function updateSummary() {
  const barber = getBarber();
  const service = getService();
  document.querySelector('#summary-barber').innerHTML = barber ? `<img src="${barber.photo}" alt=""><div><span class="summary-label">PROFISSIONAL</span><strong>${barber.name}</strong></div>` : '<span class="empty-avatar" aria-hidden="true">✂</span><div><span class="summary-label">PROFISSIONAL</span><strong>Escolha seu barbeiro</strong></div>';
  document.querySelector('#summary-service').textContent = service?.name || 'A escolher';
  document.querySelector('#summary-date').textContent = state.date ? shortDate(state.date) : 'A escolher';
  document.querySelector('#summary-time').textContent = state.time || 'A escolher';
  document.querySelector('#summary-duration').textContent = service ? `${service.duration} minutos` : '—';
  document.querySelector('#summary-total').innerHTML = `${money(service?.price || 0).replace(',00', '')}<span>,00</span>`;
}
function render(focusHeading = false) {
  panel.innerHTML = [renderBarbers, renderServices, renderDates, renderCustomer][state.step]();
  panel.style.animation = 'none'; void panel.offsetWidth; panel.style.animation = '';
  document.querySelectorAll('[data-step]').forEach(button => {
    const step = Number(button.dataset.step);
    button.disabled = step > state.step;
    button.classList.toggle('completed', step < state.step);
    if (step === state.step) button.setAttribute('aria-current', 'step'); else button.removeAttribute('aria-current');
  });
  backButton.hidden = state.step === 0;
  document.querySelector('#step-note').hidden = state.step !== 0;
  nextButton.innerHTML = `${['Escolher serviço', 'Escolher horário', 'Continuar', 'Confirmar agendamento'][state.step]} <span aria-hidden="true">${state.step === 3 ? '✓' : '→'}</span>`;
  nextButton.disabled = state.step === 0 ? !state.barber : state.step === 1 ? !state.service : state.step === 2 ? !state.date || !state.time : false;
  updateSummary();
  if (focusHeading) panel.querySelector('h3').focus({ preventScroll: true });
}
function captureCustomer() { const form = document.querySelector('#customer-form'); if (form) state.customer = Object.fromEntries(new FormData(form)); }
function goToStep(step) {
  captureCustomer(); clearError(); state.step = step; render(true);
  if (window.matchMedia('(max-width: 800px)').matches) document.querySelector('.steps').scrollIntoView({ behavior: 'smooth', block: 'start' });
}
function confirmBooking() {
  const form = document.querySelector('#customer-form');
  captureCustomer();
  const digits = state.customer.phone.replace(/\D/g, '');
  form.elements.name.setCustomValidity(state.customer.name.trim().length < 2 ? 'Informe seu nome com pelo menos dois caracteres.' : '');
  form.elements.phone.setCustomValidity(digits.length !== 10 && digits.length !== 11 ? 'Informe um celular válido com DDD (10 ou 11 dígitos).' : '');
  if (!form.reportValidity()) return;
  if (!availableTime(state.time)) { state.time = null; goToStep(2); showError('Este horário não está mais disponível. Escolha outro para continuar.'); return; }
  const bookings = readBookings();
  const booking = { id: globalThis.crypto?.randomUUID?.() || `OF-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`, barber: state.barber, service: state.service, date: state.date, time: state.time, customer: { name: state.customer.name.trim(), phone: digits, email: state.customer.email.trim() }, status: 'active', createdAt: new Date().toISOString() };
  try { writeBookings([...bookings, booking]); } catch { showError('Não foi possível salvar. Verifique se o armazenamento deste navegador está disponível e tente novamente.'); return; }
  lastBooking = booking;
  document.querySelector('#success-details').innerHTML = `<div class="success-reservation"><strong>${escapeHTML(booking.customer.name)}, seu horário está reservado.</strong>${getService(booking.service).name} com ${getBarber(booking.barber).name}<br>${fullDate(booking.date)} às ${booking.time}<br><strong>${money(getService(booking.service).price)} · pagamento na barbearia</strong></div>`;
  document.querySelector('#success-dialog').showModal();
  Object.assign(state, { step: 0, barber: null, service: null, date: null, time: null, week: 0, customer: { name: '', phone: '', email: '' } });
  clearError(); render();
}
nextButton.addEventListener('click', () => { clearError(); if (nextButton.disabled) return; if (state.step === 3) confirmBooking(); else goToStep(state.step + 1); });
backButton.addEventListener('click', () => goToStep(state.step - 1));
document.querySelector('.steps').addEventListener('click', event => { const button = event.target.closest('[data-step]'); if (button && !button.disabled) goToStep(Number(button.dataset.step)); });
panel.addEventListener('click', event => {
  const button = event.target.closest('button'); if (!button || button.disabled) return; clearError(); let focusSelector = '';
  if (button.dataset.barber) { if (state.barber !== button.dataset.barber) state.time = null; state.barber = button.dataset.barber; focusSelector = `[data-barber="${state.barber}"]`; }
  if (button.dataset.service) { if (state.service !== button.dataset.service) state.time = null; state.service = button.dataset.service; focusSelector = `[data-service="${state.service}"]`; }
  if (button.dataset.week) { state.week = Math.max(0, Math.min(8, state.week + Number(button.dataset.week))); state.date = null; state.time = null; focusSelector = `[data-week="${button.dataset.week}"]`; }
  if (button.dataset.date) { state.date = button.dataset.date; state.time = null; focusSelector = `[data-date="${state.date}"]`; }
  if (button.dataset.time) { if (!availableTime(button.dataset.time)) { render(); return; } state.time = button.dataset.time; focusSelector = `[data-time="${state.time}"]`; }
  render(); panel.querySelector(focusSelector || 'h3')?.focus({ preventScroll: true });
});
panel.addEventListener('input', event => { event.target.setCustomValidity?.(''); captureCustomer(); });
panel.addEventListener('submit', event => { event.preventDefault(); confirmBooking(); });
function updateCount() {
  const count = readBookings().filter(booking => booking.status === 'active' && new Date(`${booking.date}T${booking.time}:00`) >= new Date()).length;
  const badge = document.querySelector('.booking-count'); badge.textContent = count; badge.hidden = !count;
}
function renderBookings() {
  const bookings = readBookings().sort((a, b) => `${b.date}${b.time}`.localeCompare(`${a.date}${a.time}`));
  const list = document.querySelector('#bookings-list');
  if (!storageReadable) { list.innerHTML = '<p class="empty-bookings">Não foi possível acessar as reservas deste navegador.</p>'; return; }
  list.innerHTML = bookings.length ? bookings.map(booking => {
    const barber = getBarber(booking.barber); const service = getService(booking.service); const future = new Date(`${booking.date}T${booking.time}:00`) > new Date();
    return `<article class="saved-booking"><div class="saved-booking-top"><img src="${barber.photo}" alt=""><div><h3>${service.name}</h3><p>com ${barber.name}</p></div></div><div class="saved-booking-info">${fullDate(booking.date)} · ${booking.time}<br>${money(service.price)} · ${service.duration} min</div><div class="saved-booking-actions"><span class="booking-status">${booking.status === 'cancelled' ? 'CANCELADO' : future ? 'RESERVADO NESTE NAVEGADOR' : 'HORÁRIO ENCERRADO'}</span>${booking.status === 'active' && future ? `<button class="cancel-button" data-cancel="${escapeHTML(booking.id)}">Cancelar reserva</button>` : ''}</div></article>`;
  }).join('') : '<div class="empty-bookings"><span>Seu tempo, do seu jeito.</span><p>Você ainda não tem agendamentos.<br>Escolha seu barbeiro para começar.</p><button class="primary-button" id="empty-start">Fazer um agendamento →</button></div>';
}
document.querySelectorAll('[data-open]').forEach(button => button.addEventListener('click', () => { if (button.dataset.open === 'bookings-dialog') renderBookings(); document.getElementById(button.dataset.open).showModal(); }));
document.querySelectorAll('dialog').forEach(dialog => {
  dialog.querySelector('.close-dialog')?.addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', event => { if (event.target === dialog) { const rect = dialog.getBoundingClientRect(); if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close(); } });
});
document.querySelector('.close-about').addEventListener('click', () => { document.querySelector('#about-dialog').close(); document.querySelector('#agendar').scrollIntoView({ behavior: 'smooth' }); });
document.querySelector('#bookings-list').addEventListener('click', event => {
  const button = event.target.closest('[data-cancel]'); if (button) { cancelId = button.dataset.cancel; document.querySelector('#cancel-dialog').showModal(); }
  if (event.target.closest('#empty-start')) { document.querySelector('#bookings-dialog').close(); document.querySelector('#agendar').scrollIntoView({ behavior: 'smooth' }); }
});
document.querySelector('#keep-booking').addEventListener('click', () => document.querySelector('#cancel-dialog').close());
document.querySelector('#confirm-cancel').addEventListener('click', () => {
  try { const bookings = readBookings(); writeBookings(bookings.map(booking => booking.id === cancelId ? { ...booking, status: 'cancelled' } : booking)); document.querySelector('#cancel-dialog').close(); renderBookings(); if (state.step === 2) render(); }
  catch { document.querySelector('#cancel-dialog p:not(.eyebrow)').textContent = 'Não foi possível salvar o cancelamento. Tente novamente.'; }
});
document.querySelector('#new-booking').addEventListener('click', () => { document.querySelector('#success-dialog').close(); document.querySelector('#agendar').scrollIntoView({ behavior: 'smooth' }); });
function calendarTimestamp(date) { return `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}T${String(date.getHours()).padStart(2, '0')}${String(date.getMinutes()).padStart(2, '0')}00`; }
document.querySelector('#calendar-button').addEventListener('click', () => {
  if (!lastBooking) return; const booking = lastBooking; const start = new Date(`${booking.date}T${booking.time}:00`); const end = new Date(start.getTime() + getService(booking.service).duration * 60000);
  const content = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//GS RISE//Agendamento//PT-BR', 'CALSCALE:GREGORIAN', 'BEGIN:VEVENT', `UID:${booking.id}@gsrise.local`, `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')}`, `DTSTART:${calendarTimestamp(start)}`, `DTEND:${calendarTimestamp(end)}`, `SUMMARY:${getService(booking.service).name} - Barbearia GS RISE`, `DESCRIPTION:Com ${getBarber(booking.barber).name}. Reserva demonstrativa salva no navegador.`, 'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
  const url = URL.createObjectURL(new Blob([content], { type: 'text/calendar;charset=utf-8' })); const link = document.createElement('a'); link.href = url; link.download = 'gs-rise-agendamento.ics'; document.body.append(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
});
window.addEventListener('storage', () => { updateCount(); if (document.querySelector('#bookings-dialog').open) renderBookings(); if (state.time && !availableTime(state.time)) { state.time = null; if (state.step === 2) render(); else updateSummary(); } });
document.querySelector('#year').textContent = new Date().getFullYear();
updateCount();
render();
