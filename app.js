(() => {
  'use strict';
  const DB_NAME = 'meu-publis-db';
  const DB_VERSION = 2;
  const STORE = 'campaigns';
  const CREATOR_STORE = 'creatorItems';
  const BACKUP_VERSION = 2;
  const FALLBACK_KEY = 'meu-publis-records-v1';
  const CREATOR_FALLBACK_KEY = 'meu-publis-creator-items-v1';
  const $ = (id) => document.getElementById(id);
  const money = (cents) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format((Number(cents) || 0) / 100);
  const monthNames = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
  const creatorTypes = {
    permuta: { label: 'Permuta', icon: '🎁', titleLabel: 'Marca parceira', placeholder: 'Ex.: Marca de skincare', dateLabel: 'Data combinada', statuses: ['A combinar','Produto a caminho','Produto recebido','Entrega pendente','Concluída','Cancelada'] },
    evento: { label: 'Evento presencial', icon: '📍', titleLabel: 'Nome do evento / marca', placeholder: 'Ex.: Lançamento da marca', dateLabel: 'Data do evento', statuses: ['Convite recebido','Confirmado','Realizado','Cancelado'] },
    reuniao: { label: 'Reunião', icon: '☕', titleLabel: 'Com quem será a reunião?', placeholder: 'Ex.: Agência / Marca / Contato', dateLabel: 'Data da reunião', statuses: ['Agendada','Realizada','Remarcada','Cancelada'] },
    afiliacao: { label: 'Afiliação', icon: '🔗', titleLabel: 'Marca / programa de afiliados', placeholder: 'Ex.: Programa de afiliados', dateLabel: 'Data de início', statuses: ['Ativa','Pausada','Encerrada'] }
  };
  let db = null;
  let toastTimer = null;
  let activeCreatorType = 'all';

  function showToast(message) {
    const toast = $('toast');
    toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('show'), 2700);
  }

  function openDatabase() {
    return new Promise((resolve, reject) => {
      if (!('indexedDB' in window)) return reject(new Error('IndexedDB não disponível'));
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        const database = request.result;
        if (!database.objectStoreNames.contains(STORE)) database.createObjectStore(STORE, { keyPath: 'id' });
        if (!database.objectStoreNames.contains(CREATOR_STORE)) database.createObjectStore(CREATOR_STORE, { keyPath: 'id' });
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error('Falha ao abrir banco local'));
      request.onblocked = () => reject(new Error('Feche outras abas do Meu Publis e tente novamente.'));
    });
  }

  function getAllFromStore(storeName, fallbackKey) {
    if (!db) {
      try { const stored = localStorage.getItem(fallbackKey); return Promise.resolve(stored ? JSON.parse(stored) : []); }
      catch (error) { return Promise.reject(new Error('Não foi possível ler os dados salvos neste navegador.')); }
    }
    return new Promise((resolve, reject) => {
      const request = db.transaction(storeName, 'readonly').objectStore(storeName).getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }
  function saveToStore(storeName, fallbackKey, record) {
    if (!db) return getAllFromStore(storeName, fallbackKey).then(rows => {
      const index = rows.findIndex(item => item.id === record.id);
      if (index >= 0) rows[index] = record; else rows.push(record);
      localStorage.setItem(fallbackKey, JSON.stringify(rows));
    });
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readwrite');
      tx.objectStore(storeName).put(record);
      tx.oncomplete = resolve; tx.onerror = () => reject(tx.error); tx.onabort = () => reject(tx.error);
    });
  }
  function removeFromStore(storeName, fallbackKey, id) {
    if (!db) return getAllFromStore(storeName, fallbackKey).then(rows => localStorage.setItem(fallbackKey, JSON.stringify(rows.filter(item => item.id !== id))));
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readwrite');
      tx.objectStore(storeName).delete(id);
      tx.oncomplete = resolve; tx.onerror = () => reject(tx.error); tx.onabort = () => reject(tx.error);
    });
  }
  async function getCampaigns() { return getAllFromStore(STORE, FALLBACK_KEY); }
  async function saveCampaign(campaign) { return saveToStore(STORE, FALLBACK_KEY, campaign); }
  async function removeCampaign(id) { return removeFromStore(STORE, FALLBACK_KEY, id); }
  async function getCreatorItems() { return getAllFromStore(CREATOR_STORE, CREATOR_FALLBACK_KEY); }
  async function saveCreatorItem(item) { return saveToStore(CREATOR_STORE, CREATOR_FALLBACK_KEY, item); }
  async function removeCreatorItem(id) { return removeFromStore(CREATOR_STORE, CREATOR_FALLBACK_KEY, id); }

  async function replaceAllData(campaigns, creatorItems) {
    if (!db) {
      localStorage.setItem(FALLBACK_KEY, JSON.stringify(campaigns));
      localStorage.setItem(CREATOR_FALLBACK_KEY, JSON.stringify(creatorItems));
      return;
    }
    await new Promise((resolve, reject) => {
      const tx = db.transaction([STORE, CREATOR_STORE], 'readwrite');
      const campaignStore = tx.objectStore(STORE);
      const creatorStore = tx.objectStore(CREATOR_STORE);
      campaignStore.clear(); creatorStore.clear();
      campaigns.forEach(item => campaignStore.put(item));
      creatorItems.forEach(item => creatorStore.put(item));
      tx.oncomplete = resolve; tx.onerror = () => reject(tx.error); tx.onabort = () => reject(tx.error);
    });
  }

  function parseDate(dateString) {
    const parts = String(dateString || '').split('-').map(Number);
    if (parts.length !== 3 || parts.some(Number.isNaN)) return null;
    return new Date(parts[0], parts[1] - 1, parts[2], 12, 0, 0);
  }
  function displayDate(dateString) {
    const date = parseDate(dateString);
    return date ? new Intl.DateTimeFormat('pt-BR').format(date) : 'Data não informada';
  }
  function asCents(value) { return Math.round(Number(value) * 100); }
  function newId() { return (window.crypto && window.crypto.randomUUID ? window.crypto.randomUUID() : `registro-${Date.now()}-${Math.random().toString(16).slice(2)}`); }
  function todayLocal() { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; }
  function allTotals(records) {
    return records.reduce((sum, item) => { sum.contracted += item.amountCents; if (item.status === 'received') sum.received += item.amountCents; else sum.pending += item.amountCents; return sum; }, { contracted: 0, received: 0, pending: 0 });
  }
  function selectedRecords(records) {
    const month = $('monthFilter').value;
    const year = $('yearFilter').value;
    const term = $('searchInput').value.trim().toLocaleLowerCase('pt-BR');
    return records.filter(item => {
      const d = parseDate(item.date);
      if (!d) return false;
      if (month !== 'all' && d.getMonth() !== Number(month)) return false;
      if (year !== 'all' && d.getFullYear() !== Number(year)) return false;
      if (term && !(`${item.brand} ${item.delivery} ${item.details || ''}`).toLocaleLowerCase('pt-BR').includes(term)) return false;
      return true;
    }).sort((a,b) => b.date.localeCompare(a.date) || (b.updatedAt || '').localeCompare(a.updatedAt || ''));
  }
  function updateYearOptions(records, selectId) {
    const select = $(selectId);
    const current = select.value;
    const years = new Set([new Date().getFullYear(), ...records.map(r => Number(String(r.date).slice(0,4))).filter(Number.isFinite)]);
    select.innerHTML = '<option value="all">Todos os anos</option>' + [...years].sort((a,b)=>b-a).map(year => `<option value="${year}">${year}</option>`).join('');
    select.value = [...years].some(y => String(y) === current) || current === 'all' ? current : 'all';
  }
  function periodCaption() {
    const m = $('monthFilter').value, y = $('yearFilter').value;
    if (m !== 'all' && y !== 'all') return `${monthNames[Number(m)]} de ${y}`;
    if (m !== 'all') return monthNames[Number(m)];
    if (y !== 'all') return `Ano de ${y}`;
    return 'Todo o histórico';
  }
  function render(records) {
    updateYearOptions(records, 'yearFilter');
    const totals = allTotals(records);
    $('totalContracted').textContent = money(totals.contracted);
    $('totalReceived').textContent = money(totals.received);
    $('totalPending').textContent = money(totals.pending);
    const filtered = selectedRecords(records);
    const period = allTotals(filtered);
    $('periodLabel').textContent = periodCaption();
    $('periodTotal').textContent = money(period.contracted);
    $('periodReceived').textContent = money(period.received);
    $('periodPending').textContent = money(period.pending);
    $('periodProgress').style.width = period.contracted ? `${Math.min(100, period.received / period.contracted * 100)}%` : '0%';
    $('campaignCount').textContent = filtered.length;
    const list = $('campaignList');
    if (!filtered.length) {
      const hasRecords = records.length > 0;
      list.innerHTML = `<div class="empty-state"><div class="empty-emoji">${hasRecords ? '🔎' : '🌷'}</div><strong>${hasRecords ? 'Nenhuma publi neste filtro' : 'Seu controle começa aqui'}</strong><p>${hasRecords ? 'Experimente trocar o mês, o ano ou a busca.' : 'Cadastre sua primeira campanha para acompanhar valores e pagamentos.'}</p>${hasRecords ? '' : '<button class="primary-button" id="emptyNewButton">＋ Cadastrar primeira publi</button>'}</div>`;
      const emptyButton = $('emptyNewButton');
      if (emptyButton) emptyButton.addEventListener('click', () => openCampaignForm());
      return;
    }
    list.innerHTML = filtered.map(item => {
      const received = item.status === 'received';
      const detail = item.details ? `<p class="campaign-details">${escapeHtml(item.details)}</p>` : '';
      return `<article class="campaign-card" data-id="${escapeHtml(item.id)}">
        <div class="campaign-main"><div class="campaign-title-row"><span class="campaign-title">${escapeHtml(item.brand)}</span><span class="status-badge ${received ? 'status-received' : 'status-pending'}">${received ? '✓ Recebido' : '◷ Pendente'}</span></div>
        <div class="campaign-meta"><span><svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/></svg>${displayDate(item.date)}</span><span><svg viewBox="0 0 24 24"><path d="M4 5h16v14H4zM8 9h8M8 13h5"/></svg>${escapeHtml(item.delivery)}</span></div>${detail}</div>
        <div class="campaign-side"><strong class="campaign-amount">${money(item.amountCents)}</strong><div class="card-actions"><button class="small-action" data-action="edit" data-id="${escapeHtml(item.id)}">Editar</button><button class="small-action" data-action="delete" data-id="${escapeHtml(item.id)}">Excluir</button></div></div>
      </article>`;
    }).join('');
    list.querySelectorAll('[data-action="edit"]').forEach(button => button.addEventListener('click', () => editCampaign(button.dataset.id)));
    list.querySelectorAll('[data-action="delete"]').forEach(button => button.addEventListener('click', () => deleteCampaign(button.dataset.id)));
  }
  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  }
  async function refresh() {
    try { render(await getCampaigns()); }
    catch (error) { console.error(error); showToast('Não foi possível ler os registros locais.'); }
  }
  function openCampaignForm(item = null) {
    $('campaignForm').reset();
    $('campaignId').value = item?.id || '';
    $('modalTitle').textContent = item ? 'Editar publi' : 'Cadastrar publi';
    $('brandInput').value = item?.brand || '';
    $('amountInput').value = item ? (item.amountCents / 100).toFixed(2) : '';
    $('dateInput').value = item?.date || todayLocal();
    $('deliveryInput').value = item?.delivery || '';
    $('detailsInput').value = item?.details || '';
    const status = item?.status || 'pending';
    document.querySelector(`input[name="paymentStatus"][value="${status}"]`).checked = true;
    $('campaignModal').hidden = false;
    document.body.style.overflow = 'hidden';
    setTimeout(() => $('brandInput').focus({preventScroll:true}), 80);
  }
  function closeCampaignForm() { $('campaignModal').hidden = true; document.body.style.overflow = ''; }
  async function editCampaign(id) {
    const item = (await getCampaigns()).find(x => x.id === id);
    if (item) openCampaignForm(item);
  }
  async function deleteCampaign(id) {
    const records = await getCampaigns();
    const item = records.find(x => x.id === id);
    if (!item) return;
    if (!window.confirm(`Excluir a publi de ${item.brand}? Essa ação não poderá ser desfeita.`)) return;
    try { await removeCampaign(id); await refresh(); showToast('Publi excluída.'); }
    catch (error) { console.error(error); showToast('Não foi possível excluir a publi.'); }
  }
  $('campaignForm').addEventListener('submit', async event => {
    event.preventDefault();
    const brand = $('brandInput').value.trim();
    const amount = Number($('amountInput').value);
    const date = $('dateInput').value;
    const delivery = $('deliveryInput').value;
    if (!brand || !Number.isFinite(amount) || amount <= 0 || !date || !delivery) { showToast('Confira os campos obrigatórios.'); return; }
    const existingId = $('campaignId').value;
    const existing = existingId ? (await getCampaigns()).find(item => item.id === existingId) : null;
    const now = new Date().toISOString();
    const campaign = { id: existingId || newId(), brand, amountCents: asCents(amount), date, delivery, details: $('detailsInput').value.trim(), status: document.querySelector('input[name="paymentStatus"]:checked').value, createdAt: existing?.createdAt || now, updatedAt: now };
    try { await saveCampaign(campaign); closeCampaignForm(); const updatedRecords = await getCampaigns(); const campaignDate = parseDate(campaign.date); updateYearOptions(updatedRecords, 'yearFilter'); $('monthFilter').value = String(campaignDate.getMonth()); $('yearFilter').value = String(campaignDate.getFullYear()); $('searchInput').value = ''; render(updatedRecords); showToast(existingId ? 'Alterações salvas!' : 'Publi cadastrada!'); }
    catch (error) { console.error(error); showToast('Falha ao salvar. Faça um backup dos registros existentes.'); }
  });
  $('newCampaignButton').addEventListener('click', () => openCampaignForm());
  $('closeModalButton').addEventListener('click', closeCampaignForm);
  $('cancelModalButton').addEventListener('click', closeCampaignForm);
  $('campaignModal').addEventListener('click', event => { if (event.target === $('campaignModal')) closeCampaignForm(); });
  ['monthFilter','yearFilter','searchInput'].forEach(id => $(id).addEventListener('input', refresh));

  function creatorDateFiltered(records) {
    const month = $('creatorMonthFilter').value;
    const year = $('creatorYearFilter').value;
    const term = $('creatorSearchInput').value.trim().toLocaleLowerCase('pt-BR');
    return records.filter(item => {
      const date = parseDate(item.date);
      if (!date) return false;
      if (month !== 'all' && date.getMonth() !== Number(month)) return false;
      if (year !== 'all' && date.getFullYear() !== Number(year)) return false;
      const text = [item.title, item.details, item.exchangeItem, item.exchangeDelivery, item.place, item.couponCode, item.affiliateLink, item.status].join(' ').toLocaleLowerCase('pt-BR');
      if (term && !text.includes(term)) return false;
      if (activeCreatorType !== 'all' && item.type !== activeCreatorType) return false;
      return true;
    }).sort((a,b) => b.date.localeCompare(a.date) || (b.updatedAt || '').localeCompare(a.updatedAt || ''));
  }
  function safeExternalUrl(value) {
    try { const url = new URL(value); return ['http:','https:'].includes(url.protocol) ? url.href : ''; }
    catch (error) { return ''; }
  }
  function creatorSubline(item) {
    const parts = [];
    if (item.type === 'permuta') {
      if (item.exchangeItem) parts.push(`Produto: ${escapeHtml(item.exchangeItem)}`);
      if (item.estimatedValueCents > 0) parts.push(`Valor estimado ${money(item.estimatedValueCents)}`);
      if (item.exchangeDelivery) parts.push(`Entrega: ${escapeHtml(item.exchangeDelivery)}`);
    } else if (item.type === 'evento' || item.type === 'reuniao') {
      if (item.time) parts.push(escapeHtml(item.time));
      if (item.place) parts.push(escapeHtml(item.place));
    } else if (item.type === 'afiliacao') {
      if (item.couponCode) parts.push(`Cupom: ${escapeHtml(item.couponCode)}`);
      if (Number.isFinite(item.commissionRate)) parts.push(`Comissão: ${String(item.commissionRate).replace('.', ',')}%`);
      if (item.endDate) parts.push(`Até ${displayDate(item.endDate)}`);
    }
    return parts.length ? `<p class="creator-subline">${parts.join('<span aria-hidden="true"> · </span>')}</p>` : '';
  }
  function renderCreatorItems(records) {
    updateYearOptions(records, 'creatorYearFilter');
    $('permutaCount').textContent = records.filter(item => item.type === 'permuta').length;
    $('eventCount').textContent = records.filter(item => item.type === 'evento').length;
    $('meetingCount').textContent = records.filter(item => item.type === 'reuniao').length;
    $('affiliateCount').textContent = records.filter(item => item.type === 'afiliacao').length;
    const filtered = creatorDateFiltered(records);
    $('creatorCount').textContent = filtered.length;
    const list = $('creatorItemList');
    if (!filtered.length) {
      const anyRecords = records.length > 0;
      list.innerHTML = `<div class="empty-state"><div class="empty-emoji">${anyRecords ? '🔎' : '🌷'}</div><strong>${anyRecords ? 'Nenhum registro neste filtro' : 'Seu espaço creator começa aqui'}</strong><p>${anyRecords ? 'Troque a categoria, o mês, o ano ou a busca.' : 'Cadastre permutas, convites, reuniões e programas de afiliados para não perder nenhum combinado.'}</p>${anyRecords ? '' : '<button class="primary-button" id="emptyCreatorButton">＋ Adicionar primeiro registro</button>'}</div>`;
      const emptyButton = $('emptyCreatorButton');
      if (emptyButton) emptyButton.addEventListener('click', () => openCreatorForm());
      return;
    }
    list.innerHTML = filtered.map(item => {
      const meta = creatorTypes[item.type] || creatorTypes.permuta;
      const subline = creatorSubline(item);
      const details = item.details ? `<p class="campaign-details">${escapeHtml(item.details)}</p>` : '';
      const safeLink = item.type === 'afiliacao' ? safeExternalUrl(item.affiliateLink || '') : '';
      const linkLine = safeLink ? `<a class="creator-link" href="${escapeHtml(safeLink)}" target="_blank" rel="noopener noreferrer">Abrir link de afiliada ↗</a>` : '';
      const statusClass = item.status.toLocaleLowerCase('pt-BR').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-');
      return `<article class="creator-item-card creator-${item.type}" data-id="${escapeHtml(item.id)}">
        <div class="creator-item-icon" aria-hidden="true">${meta.icon}</div>
        <div class="creator-item-main"><div class="creator-item-title-row"><span class="creator-type-label">${meta.label}</span><span class="creator-status status-${statusClass}">${escapeHtml(item.status)}</span></div>
        <h4>${escapeHtml(item.title)}</h4><div class="creator-item-meta"><span>▦ ${displayDate(item.date)}</span>${item.endDate ? `<span>Até ${displayDate(item.endDate)}</span>` : ''}</div>${subline}${linkLine}${details}</div>
        <div class="creator-item-actions"><button class="small-action" data-creator-action="edit" data-id="${escapeHtml(item.id)}">Editar</button><button class="small-action" data-creator-action="delete" data-id="${escapeHtml(item.id)}">Excluir</button></div>
      </article>`;
    }).join('');
    list.querySelectorAll('[data-creator-action="edit"]').forEach(button => button.addEventListener('click', () => editCreatorItem(button.dataset.id)));
    list.querySelectorAll('[data-creator-action="delete"]').forEach(button => button.addEventListener('click', () => deleteCreatorItem(button.dataset.id)));
  }
  async function refreshCreatorItems() {
    try { renderCreatorItems(await getCreatorItems()); }
    catch (error) { console.error(error); showToast('Não foi possível ler os registros da rotina creator.'); }
  }
  function updateCreatorFormFields(type, selectedStatus) {
    const config = creatorTypes[type] || creatorTypes.permuta;
    $('creatorTitleLabel').innerHTML = `${config.titleLabel} <b>*</b>`;
    $('creatorTitleInput').placeholder = config.placeholder;
    $('creatorDateLabel').innerHTML = `${config.dateLabel} <b>*</b>`;
    ['permuta','evento','reuniao','afiliacao'].forEach(key => { $(`${key}Fields`).hidden = key !== type; });
    $('creatorStatusInput').innerHTML = config.statuses.map(status => `<option value="${escapeHtml(status)}">${escapeHtml(status)}</option>`).join('');
    if (selectedStatus && config.statuses.includes(selectedStatus)) $('creatorStatusInput').value = selectedStatus;
  }
  function openCreatorForm(item = null) {
    $('creatorItemForm').reset();
    $('creatorItemId').value = item?.id || '';
    $('creatorModalTitle').textContent = item ? 'Editar registro' : 'Novo registro';
    const type = item?.type || 'permuta';
    $('creatorTypeInput').value = type;
    updateCreatorFormFields(type, item?.status);
    $('creatorTitleInput').value = item?.title || '';
    $('creatorDateInput').value = item?.date || todayLocal();
    $('exchangeItemInput').value = item?.exchangeItem || '';
    $('exchangeValueInput').value = item?.estimatedValueCents ? (item.estimatedValueCents / 100).toFixed(2) : '';
    $('exchangeDeliveryInput').value = item?.exchangeDelivery || '';
    $('eventTimeInput').value = type === 'evento' ? (item?.time || '') : '';
    $('eventPlaceInput').value = type === 'evento' ? (item?.place || '') : '';
    $('meetingTimeInput').value = type === 'reuniao' ? (item?.time || '') : '';
    $('meetingPlaceInput').value = type === 'reuniao' ? (item?.place || '') : '';
    $('affiliateCouponInput').value = item?.couponCode || '';
    $('affiliateRateInput').value = Number.isFinite(item?.commissionRate) ? item.commissionRate : '';
    $('affiliateLinkInput').value = item?.affiliateLink || '';
    $('affiliateEndDateInput').value = item?.endDate || '';
    $('creatorDetailsInput').value = item?.details || '';
    $('creatorItemModal').hidden = false;
    document.body.style.overflow = 'hidden';
    setTimeout(() => $('creatorTitleInput').focus({preventScroll:true}), 80);
  }
  function closeCreatorForm() { $('creatorItemModal').hidden = true; document.body.style.overflow = ''; }
  async function editCreatorItem(id) {
    const item = (await getCreatorItems()).find(record => record.id === id);
    if (item) openCreatorForm(item);
  }
  async function deleteCreatorItem(id) {
    const item = (await getCreatorItems()).find(record => record.id === id);
    if (!item) return;
    if (!window.confirm(`Excluir o registro "${item.title}"? Essa ação não poderá ser desfeita.`)) return;
    try { await removeCreatorItem(id); await refreshCreatorItems(); showToast('Registro excluído.'); }
    catch (error) { console.error(error); showToast('Não foi possível excluir o registro.'); }
  }
  $('creatorTypeInput').addEventListener('change', () => updateCreatorFormFields($('creatorTypeInput').value));
  $('creatorItemForm').addEventListener('submit', async event => {
    event.preventDefault();
    const type = $('creatorTypeInput').value;
    const title = $('creatorTitleInput').value.trim();
    const date = $('creatorDateInput').value;
    if (!creatorTypes[type] || !title || !parseDate(date)) { showToast('Confira a categoria, o nome e a data.'); return; }
    const value = $('exchangeValueInput').value.trim();
    const estimatedValueCents = value === '' ? 0 : asCents(Number(value));
    if (!Number.isSafeInteger(estimatedValueCents) || estimatedValueCents < 0) { showToast('Confira o valor estimado da permuta.'); return; }
    const rateText = $('affiliateRateInput').value.trim();
    const commissionRate = rateText === '' ? null : Number(rateText);
    if (commissionRate !== null && (!Number.isFinite(commissionRate) || commissionRate < 0 || commissionRate > 100)) { showToast('A comissão deve ficar entre 0% e 100%.'); return; }
    const existingId = $('creatorItemId').value;
    const existing = existingId ? (await getCreatorItems()).find(item => item.id === existingId) : null;
    const now = new Date().toISOString();
    const item = {
      id: existingId || newId(), type, title, date, status: $('creatorStatusInput').value,
      details: $('creatorDetailsInput').value.trim(),
      exchangeItem: type === 'permuta' ? $('exchangeItemInput').value.trim() : '',
      estimatedValueCents: type === 'permuta' ? estimatedValueCents : 0,
      exchangeDelivery: type === 'permuta' ? $('exchangeDeliveryInput').value.trim() : '',
      time: type === 'evento' ? $('eventTimeInput').value : type === 'reuniao' ? $('meetingTimeInput').value : '',
      place: type === 'evento' ? $('eventPlaceInput').value.trim() : type === 'reuniao' ? $('meetingPlaceInput').value.trim() : '',
      couponCode: type === 'afiliacao' ? $('affiliateCouponInput').value.trim() : '',
      commissionRate: type === 'afiliacao' ? commissionRate : null,
      affiliateLink: type === 'afiliacao' ? $('affiliateLinkInput').value.trim() : '',
      endDate: type === 'afiliacao' ? $('affiliateEndDateInput').value : '',
      createdAt: existing?.createdAt || now, updatedAt: now
    };
    try {
      await saveCreatorItem(item); closeCreatorForm();
      const updated = await getCreatorItems();
      updateYearOptions(updated, 'creatorYearFilter');
      const itemDate = parseDate(item.date);
      $('creatorMonthFilter').value = String(itemDate.getMonth()); $('creatorYearFilter').value = String(itemDate.getFullYear());
      $('creatorSearchInput').value = ''; activeCreatorType = 'all';
      document.querySelectorAll('[data-type-filter]').forEach(button => button.classList.toggle('active', button.dataset.typeFilter === 'all'));
      renderCreatorItems(updated); showToast(existingId ? 'Registro atualizado!' : 'Registro cadastrado!');
    } catch (error) { console.error(error); showToast('Falha ao salvar o registro. Faça um backup e tente novamente.'); }
  });
  $('newCreatorItemButton').addEventListener('click', () => openCreatorForm());
  $('closeCreatorModalButton').addEventListener('click', closeCreatorForm);
  $('cancelCreatorModalButton').addEventListener('click', closeCreatorForm);
  $('creatorItemModal').addEventListener('click', event => { if (event.target === $('creatorItemModal')) closeCreatorForm(); });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && !$('campaignModal').hidden) closeCampaignForm();
    if (event.key === 'Escape' && !$('creatorItemModal').hidden) closeCreatorForm();
  });
  ['creatorMonthFilter','creatorYearFilter','creatorSearchInput'].forEach(id => $(id).addEventListener('input', refreshCreatorItems));
  document.querySelectorAll('[data-type-filter]').forEach(button => button.addEventListener('click', () => {
    activeCreatorType = button.dataset.typeFilter;
    document.querySelectorAll('[data-type-filter]').forEach(chip => chip.classList.toggle('active', chip === button));
    refreshCreatorItems();
  }));
  function switchPage(page) {
    const creator = page === 'creator';
    $('financePage').hidden = creator;
    $('creatorPage').hidden = !creator;
    $('financeTab').classList.toggle('active', !creator);
    $('creatorTab').classList.toggle('active', creator);
    if (creator) { $('creatorTab').setAttribute('aria-current','page'); $('financeTab').removeAttribute('aria-current'); refreshCreatorItems(); }
    else { $('financeTab').setAttribute('aria-current','page'); $('creatorTab').removeAttribute('aria-current'); refresh(); }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  $('financeTab').addEventListener('click', () => switchPage('finance'));
  $('creatorTab').addEventListener('click', () => switchPage('creator'));

  function downloadFile(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = filename; a.style.display = 'none';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  }
  async function exportBackup() {
    try {
      const [records, creatorItems] = await Promise.all([getCampaigns(), getCreatorItems()]);
      const backup = { app: 'Meu Publis', backupVersion: BACKUP_VERSION, exportedAt: new Date().toISOString(), records, creatorItems };
      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json;charset=utf-8' });
      downloadFile(blob, `meu-publis-backup-${new Date().toISOString().slice(0,10)}.json`);
      showToast('Backup completo preparado: publis e rotina creator.');
    } catch (error) { console.error(error); showToast('Não foi possível gerar o backup.'); }
  }
  function normalizeImportedRecords(input) {
    if (!Array.isArray(input)) throw new Error('O backup não contém uma lista de publis válida.');
    if (input.length > 10000) throw new Error('O arquivo possui registros demais.');
    const now = new Date().toISOString();
    return input.map((item, index) => {
      const brand = String(item.brand || '').trim();
      const date = String(item.date || '');
      const dateObj = parseDate(date);
      const amountCents = Number.isInteger(item.amountCents) ? item.amountCents : Math.round(Number(item.amount) * 100);
      if (!brand || !dateObj || !Number.isSafeInteger(amountCents) || amountCents < 1 || !String(item.delivery || '').trim()) throw new Error(`Publi ${index + 1} inválida. O backup não foi importado.`);
      return { id: String(item.id || newId()), brand: brand.slice(0,90), amountCents, date, delivery: String(item.delivery).slice(0,80), details: String(item.details || '').slice(0,350), status: item.status === 'received' ? 'received' : 'pending', createdAt: item.createdAt || now, updatedAt: item.updatedAt || now };
    });
  }
  function normalizeImportedCreatorItems(input) {
    if (!Array.isArray(input)) throw new Error('A lista da rotina creator no backup está inválida.');
    if (input.length > 10000) throw new Error('O backup possui registros demais.');
    const now = new Date().toISOString();
    return input.map((item, index) => {
      const type = String(item.type || '');
      const title = String(item.title || '').trim();
      const date = String(item.date || '');
      if (!creatorTypes[type] || !title || !parseDate(date)) throw new Error(`Registro creator ${index + 1} inválido. O backup não foi importado.`);
      const rate = item.commissionRate === null || item.commissionRate === '' || item.commissionRate === undefined ? null : Number(item.commissionRate);
      if (rate !== null && (!Number.isFinite(rate) || rate < 0 || rate > 100)) throw new Error(`Comissão inválida no registro ${index + 1}.`);
      const estimatedValueCents = Number.isSafeInteger(item.estimatedValueCents) ? item.estimatedValueCents : 0;
      return {
        id: String(item.id || newId()), type, title: title.slice(0,100), date,
        status: creatorTypes[type].statuses.includes(item.status) ? item.status : creatorTypes[type].statuses[0],
        details: String(item.details || '').slice(0,500), exchangeItem: String(item.exchangeItem || '').slice(0,120),
        estimatedValueCents: Math.max(0, estimatedValueCents), exchangeDelivery: String(item.exchangeDelivery || '').slice(0,100),
        time: String(item.time || '').slice(0,5), place: String(item.place || '').slice(0,180), couponCode: String(item.couponCode || '').slice(0,60),
        commissionRate: rate, affiliateLink: String(item.affiliateLink || '').slice(0,500), endDate: parseDate(item.endDate) ? item.endDate : '',
        createdAt: item.createdAt || now, updatedAt: item.updatedAt || now
      };
    });
  }
  async function importBackup(file) {
    if (!file) return;
    try {
      const contents = await file.text();
      const data = JSON.parse(contents);
      const importedCampaigns = normalizeImportedRecords(Array.isArray(data) ? data : (data.records ?? []));
      const importedCreatorItems = normalizeImportedCreatorItems(Array.isArray(data) ? [] : (data.creatorItems ?? []));
      if (!window.confirm(`Este backup contém ${importedCampaigns.length} publis e ${importedCreatorItems.length} registros de rotina creator. A restauração substituirá os dois conjuntos atuais. Faça um backup atual antes, caso queira preservá-los. Continuar?`)) return;
      await replaceAllData(importedCampaigns, importedCreatorItems);
      $('monthFilter').value = 'all'; $('yearFilter').value = 'all'; $('searchInput').value = '';
      $('creatorMonthFilter').value = 'all'; $('creatorYearFilter').value = 'all'; $('creatorSearchInput').value = ''; activeCreatorType = 'all';
      document.querySelectorAll('[data-type-filter]').forEach(button => button.classList.toggle('active', button.dataset.typeFilter === 'all'));
      await Promise.all([refresh(), refreshCreatorItems()]);
      showToast('Backup completo restaurado com sucesso.');
    } catch (error) { console.error(error); showToast(error.message || 'Arquivo de backup inválido.'); }
    finally { $('importFile').value = ''; }
  }
  $('exportButton').addEventListener('click', exportBackup);
  $('backupNoteButton').addEventListener('click', exportBackup);
  $('importButton').addEventListener('click', () => $('importFile').click());
  $('importFile').addEventListener('change', event => importBackup(event.target.files?.[0]));

  async function requestPersistentStorage() {
    try { if (navigator.storage?.persist) await navigator.storage.persist(); } catch (error) { /* O navegador pode recusar; backups continuam disponíveis. */ }
  }
  async function init() {
    try { db = await openDatabase(); }
    catch (error) { console.warn('IndexedDB indisponível; usando armazenamento local alternativo.', error); try { localStorage.getItem(FALLBACK_KEY); showToast('Armazenamento alternativo ativado neste navegador.'); } catch (storageError) { showToast('Atenção: este navegador bloqueou o armazenamento local.'); } }
    await requestPersistentStorage();
    const now = new Date();
    const [initialRecords, initialCreatorItems] = await Promise.all([getCampaigns(), getCreatorItems()]);
    updateYearOptions(initialRecords, 'yearFilter');
    updateYearOptions(initialCreatorItems, 'creatorYearFilter');
    $('monthFilter').value = String(now.getMonth()); $('yearFilter').value = String(now.getFullYear());
    $('creatorMonthFilter').value = String(now.getMonth()); $('creatorYearFilter').value = String(now.getFullYear());
    render(initialRecords); renderCreatorItems(initialCreatorItems);
    if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
      navigator.serviceWorker.register('./service-worker.js').catch(error => console.warn('Service Worker não registrado:', error));
    }
  }
  init();
})();
