(() => {
  'use strict';
  const DB_NAME = 'meu-publis-db';
  const DB_VERSION = 1;
  const STORE = 'campaigns';
  const BACKUP_VERSION = 1;
  const FALLBACK_KEY = 'meu-publis-records-v1';
  const $ = (id) => document.getElementById(id);
  const money = (cents) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format((Number(cents) || 0) / 100);
  const monthNames = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
  let db = null;
  let toastTimer = null;

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
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error('Falha ao abrir banco local'));
    });
  }

  function transaction(mode, work) {
    return new Promise((resolve, reject) => {
      if (!db) return reject(new Error('Banco local indisponível'));
      const tx = db.transaction(STORE, mode);
      const store = tx.objectStore(STORE);
      let result;
      try { result = work(store); } catch (error) { reject(error); return; }
      tx.oncomplete = () => resolve(result && 'result' in result ? result.result : result);
      tx.onerror = () => reject(tx.error || new Error('Erro ao salvar dados'));
      tx.onabort = () => reject(tx.error || new Error('Operação cancelada'));
    });
  }

  async function getCampaigns() {
    if (!db) {
      try { const stored = localStorage.getItem(FALLBACK_KEY); return stored ? JSON.parse(stored) : []; }
      catch (error) { throw new Error('Não foi possível ler os dados salvos neste navegador.'); }
    }
    return new Promise((resolve, reject) => {
      const request = db.transaction(STORE, 'readonly').objectStore(STORE).getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }
  async function saveCampaign(campaign) {
    if (!db) { const rows = await getCampaigns(); const i = rows.findIndex(x => x.id === campaign.id); if (i >= 0) rows[i] = campaign; else rows.push(campaign); localStorage.setItem(FALLBACK_KEY, JSON.stringify(rows)); return; }
    await transaction('readwrite', store => store.put(campaign));
  }
  async function removeCampaign(id) {
    if (!db) { const rows = (await getCampaigns()).filter(x => x.id !== id); localStorage.setItem(FALLBACK_KEY, JSON.stringify(rows)); return; }
    await transaction('readwrite', store => store.delete(id));
  }
  async function replaceAllCampaigns(records) {
    if (!db) { localStorage.setItem(FALLBACK_KEY, JSON.stringify(records)); return; }
    await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      const store = tx.objectStore(STORE);
      store.clear();
      records.forEach(item => store.put(item));
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
  function updateYearOptions(records) {
    const select = $('yearFilter');
    const current = select.value;
    const years = new Set([new Date().getFullYear(), ...records.map(r => Number(r.date.slice(0,4))).filter(Number.isFinite)]);
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
    updateYearOptions(records);
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
      if (emptyButton) emptyButton.addEventListener('click', () => openForm());
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
  function openForm(item = null) {
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
  function closeForm() { $('campaignModal').hidden = true; document.body.style.overflow = ''; }
  async function editCampaign(id) {
    const item = (await getCampaigns()).find(x => x.id === id);
    if (item) openForm(item);
  }
  async function deleteCampaign(id) {
    const records = await getCampaigns();
    const item = records.find(x => x.id === id);
    if (!item) return;
    if (!window.confirm(`Excluir a publi de ${item.brand}? Essa ação não poderá ser desfeita.`)) return;
    try { await removeCampaign(id); await refresh(); showToast('Publi excluída.'); }
    catch (error) { console.error(error); showToast('Não foi possível excluir a publi.'); }
  }
  function newId() { return (window.crypto && window.crypto.randomUUID ? window.crypto.randomUUID() : `publi-${Date.now()}-${Math.random().toString(16).slice(2)}`); }
  function todayLocal() { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; }

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
    try { await saveCampaign(campaign); closeForm(); const updatedRecords = await getCampaigns(); const campaignDate = parseDate(campaign.date); updateYearOptions(updatedRecords); $('monthFilter').value = String(campaignDate.getMonth()); $('yearFilter').value = String(campaignDate.getFullYear()); $('searchInput').value = ''; render(updatedRecords); showToast(existingId ? 'Alterações salvas!' : 'Publi cadastrada!'); }
    catch (error) { console.error(error); showToast('Falha ao salvar. Faça um backup dos registros existentes.'); }
  });
  $('newCampaignButton').addEventListener('click', () => openForm());
  $('closeModalButton').addEventListener('click', closeForm);
  $('cancelModalButton').addEventListener('click', closeForm);
  $('campaignModal').addEventListener('click', event => { if (event.target === $('campaignModal')) closeForm(); });
  document.addEventListener('keydown', event => { if (event.key === 'Escape' && !$('campaignModal').hidden) closeForm(); });
  ['monthFilter','yearFilter','searchInput'].forEach(id => $(id).addEventListener('input', refresh));

  function downloadFile(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = filename; a.style.display = 'none';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  }
  async function exportBackup() {
    try {
      const records = await getCampaigns();
      const backup = { app: 'Meu Publis', backupVersion: BACKUP_VERSION, exportedAt: new Date().toISOString(), records };
      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json;charset=utf-8' });
      downloadFile(blob, `meu-publis-backup-${new Date().toISOString().slice(0,10)}.json`);
      showToast('Backup preparado. Salve o arquivo em Arquivos ou iCloud.');
    } catch (error) { console.error(error); showToast('Não foi possível gerar o backup.'); }
  }
  function normalizeImportedRecords(input) {
    if (!Array.isArray(input)) throw new Error('O arquivo não contém uma lista de registros.');
    if (input.length > 10000) throw new Error('O arquivo possui registros demais.');
    const now = new Date().toISOString();
    return input.map((item, index) => {
      const brand = String(item.brand || '').trim();
      const date = String(item.date || '');
      const dateObj = parseDate(date);
      const amountCents = Number.isInteger(item.amountCents) ? item.amountCents : Math.round(Number(item.amount) * 100);
      if (!brand || !dateObj || !Number.isSafeInteger(amountCents) || amountCents < 1 || !String(item.delivery || '').trim()) throw new Error(`Registro ${index + 1} inválido. O backup não foi importado.`);
      return { id: String(item.id || newId()), brand: brand.slice(0,90), amountCents, date, delivery: String(item.delivery).slice(0,80), details: String(item.details || '').slice(0,350), status: item.status === 'received' ? 'received' : 'pending', createdAt: item.createdAt || now, updatedAt: item.updatedAt || now };
    });
  }
  async function importBackup(file) {
    if (!file) return;
    try {
      const contents = await file.text();
      const data = JSON.parse(contents);
      const imported = normalizeImportedRecords(data.records ?? data);
      if (!window.confirm(`Este backup contém ${imported.length} publis. A restauração substituirá a lista atual. Faça um backup atual antes, caso queira preservá-la. Continuar?`)) return;
      await replaceAllCampaigns(imported);
      $('monthFilter').value = 'all'; $('yearFilter').value = 'all'; $('searchInput').value = '';
      await refresh(); showToast(`${imported.length} publis restauradas com sucesso.`);
    } catch (error) { console.error(error); showToast(error.message || 'Arquivo de backup inválido.'); }
    finally { $('importFile').value = ''; }
  }
  $('exportButton').addEventListener('click', exportBackup);
  $('backupNoteButton').addEventListener('click', exportBackup);
  $('importButton').addEventListener('click', () => $('importFile').click());
  $('importFile').addEventListener('change', event => importBackup(event.target.files?.[0]));

  async function requestPersistentStorage() {
    try { if (navigator.storage?.persist) await navigator.storage.persist(); } catch (error) { /* Browser may decline; backups remain available. */ }
  }
  async function init() {
    try { db = await openDatabase(); }
    catch (error) { console.warn('IndexedDB indisponível; usando armazenamento local alternativo.', error); try { localStorage.getItem(FALLBACK_KEY); showToast('Armazenamento alternativo ativado neste navegador.'); } catch (storageError) { showToast('Atenção: este navegador bloqueou o armazenamento local.'); } }
    await requestPersistentStorage();
    const now = new Date();
    const initialRecords = await getCampaigns();
    updateYearOptions(initialRecords);
    $('monthFilter').value = String(now.getMonth());
    $('yearFilter').value = String(now.getFullYear());
    render(initialRecords);
    if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
      navigator.serviceWorker.register('./service-worker.js').catch(error => console.warn('Service Worker não registrado:', error));
    }
  }
  init();
})();
