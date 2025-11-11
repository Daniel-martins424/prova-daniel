const LS_USERS = 'estoque_users_v1';
const LS_PRODUCTS = 'estoque_products_v1';
const LS_MOVS = 'estoque_movs_v1';
const LS_SESSION = 'estoque_session_v1';

function initApp(){

  if(!localStorage.getItem(LS_USERS)){
    const defaultUser = {id:'u_admin', name:'Admin', email:'admin@exemplo.com', pass:'admin123'};
    localStorage.setItem(LS_USERS, JSON.stringify([defaultUser]));
  }
  if(!localStorage.getItem(LS_PRODUCTS)){
    localStorage.setItem(LS_PRODUCTS, JSON.stringify([]));
  }
  if(!localStorage.getItem(LS_MOVS)){
    localStorage.setItem(LS_MOVS, JSON.stringify([]));
  }
  renderHeaderState();
  renderDashboardStats();
  renderRecentes();
}


function getUsers(){ return JSON.parse(localStorage.getItem(LS_USERS) || '[]'); }
function saveUsers(u){ localStorage.setItem(LS_USERS, JSON.stringify(u)); }

function registerUser({name, email, pass}){
  const users = getUsers();
  if(users.some(u => u.email.toLowerCase() === email.toLowerCase())) return false;
  users.push({id: 'u_' + Date.now(), name, email, pass});
  saveUsers(users);
  return true;
}

function login(email, pass){
  const users = getUsers();
  const user = users.find(u => u.email.toLowerCase() === email.toLowerCase() && u.pass === pass);
  if(user){
    localStorage.setItem(LS_SESSION, JSON.stringify({id:user.id, name:user.name, email:user.email}));
    renderHeaderState();
    renderDashboardStats();
    return true;
  }
  return false;
}

function logout(){
  localStorage.removeItem(LS_SESSION);
  renderHeaderState();
  renderDashboardStats();
  window.location.href = 'index.html';
}

function currentUser(){
  return JSON.parse(localStorage.getItem(LS_SESSION) || 'null');
}


function getProducts(){ return JSON.parse(localStorage.getItem(LS_PRODUCTS) || '[]'); }
function saveProducts(arr){ localStorage.setItem(LS_PRODUCTS, JSON.stringify(arr)); }

function addProduct(prod){
  const ps = getProducts();
  ps.push(prod);
  saveProducts(ps);
}

function updateProductStock(prodId, delta){
  const ps = getProducts();
  const p = ps.find(x => x.id === prodId);
  if(!p) return false;
  const novo = (Number(p.estoque) || 0) + Number(delta);
  if(novo < 0) return false;
  p.estoque = novo;
  saveProducts(ps);
  return true;
}

function getMovs(){ return JSON.parse(localStorage.getItem(LS_MOVS) || '[]'); }
function saveMovs(arr){ localStorage.setItem(LS_MOVS, JSON.stringify(arr)); }

function registerMovement(prodId, quantidade, responsavel='—', tipoLabel='Mov') {
 
  if(quantidade < 0){
  
    const ok = updateProductStock(prodId, quantidade);
    if(!ok) return false;
  } else {
    updateProductStock(prodId, quantidade);
  }

  const movs = getMovs();
  movs.push({
    id: 'm_' + Date.now(),
    produtoId: prodId,
    quantidade,
    responsavel,
    tipo: quantidade >= 0 ? 'Entrada' : 'Saída',
    data: new Date().toISOString()
  });
  saveMovs(movs);
  return true;
}


function renderHeaderState(){
  const user = currentUser();
  const navLogin = document.getElementById('nav-login');
  const btnLogout = document.getElementById('btn-logout');
  if(navLogin) navLogin.style.display = user ? 'none' : 'inline-block';
  if(btnLogout) btnLogout.style.display = user ? 'inline-block' : 'none';
  if(btnLogout) btnLogout.onclick = ()=> logout();

  const el = document.getElementById('ultimo-usuario');
  if(el) el.textContent = user ? user.name : '—';
}

function renderDashboardStats(){
  const ps = getProducts();
  const movs = getMovs();
  const low = ps.filter(p => (Number(p.estoque) || 0) <= (Number(p.minimo) || 0)).length;
  const elTotal = document.getElementById('total-produtos');
  const elLow = document.getElementById('produtos-baixo');
  if(elTotal) elTotal.textContent = ps.length;
  if(elLow) elLow.textContent = low;
  
  renderRecentes();
}

function renderRecentes(){
  const cont = document.getElementById('recentes-list');
  const movs = getMovs().slice(-6).reverse();
  if(!cont) return;
  if(movs.length === 0){
    cont.textContent = 'Nenhuma movimentação ainda.';
    return;
  }
  cont.innerHTML = '';
  movs.forEach(m => {
    const p = getProducts().find(x => x.id === m.produtoId) || {nome:'Produto removido'};
    const el = document.createElement('div');
    el.className = 'item';
    el.innerHTML = `<div>
      <strong>${p.nome}</strong> <span class="small muted">(${m.tipo})</span>
      <div class="small muted">${Math.abs(m.quantidade)} — ${m.responsavel}</div>
    </div>
    <div class="small muted">${(new Date(m.data)).toLocaleString()}</div>`;
    cont.appendChild(el);
  });
}

function populateProdutoSelect(){
  const sel = document.getElementById('sel-produtos');
  if(!sel) return;
  const ps = getProducts();
  sel.innerHTML = '';
  if(ps.length === 0) sel.innerHTML = '<option value="">Nenhum produto</option>';
  else {
    sel.innerHTML = '<option value="">-- selecione --</option>';
    ps.forEach(p => sel.innerHTML += `<option value="${p.id}">${p.nome} — ${p.marca || ''} (${p.estoque || 0})</option>`);
  }
}

function renderProductsTable(){
  const cont = document.getElementById('produtos-list');
  if(!cont) return;
  const ps = getProducts();
  if(ps.length === 0){
    cont.innerHTML = '<div class="small muted">Nenhum produto cadastrado.</div>';
    return;
  }
  let html = '<table class="table" style="width:100%;border-collapse:collapse"><thead style="text-align:left"><tr><th>Nome</th><th>Marca</th><th>Volume</th><th>Estoque</th><th>Mínimo</th><th></th></tr></thead><tbody>';
  ps.forEach(p=>{
    const lowClass = (Number(p.estoque)||0) <= (Number(p.minimo)||0) ? 'bad' : '';
    html += `<tr>
      <td>${p.nome}</td>
      <td>${p.marca||''}</td>
      <td>${p.volume||''} ${p.unidade||''}</td>
      <td class="${lowClass}">${p.estoque||0}</td>
      <td>${p.minimo||0}</td>
      <td><button class="btn-ghost" onclick="adjustPrompt('${p.id}')">Editar</button></td>
    </tr>`;
  });
  html += '</tbody></table>';
  cont.innerHTML = html;
}

function adjustPrompt(prodId){
  const p = getProducts().find(x => x.id === prodId);
  if(!p) return alert('Produto não encontrado.');
  const novo = prompt(`Editar estoque de "${p.nome}" (valor atual: ${p.estoque}). Insira novo valor numérico:`, p.estoque);
  if(novo === null) return;
  const n = Number(novo);
  if(Number.isNaN(n) || n < 0) return alert('Valor inválido.');
  p.estoque = n;
  saveProducts(getProducts());
  renderProductsTable();
  renderDashboardStats();
}


function getAlerts(){
  const ps = getProducts();
  return ps.filter(p => (Number(p.estoque) || 0) <= (Number(p.minimo) || 0));
}

function renderAlerts(){
  const container = document.getElementById('alertas-container');
  const empty = document.getElementById('alerta-empty');
  if(!container) return;
  const alerts = getAlerts();
  container.innerHTML = '';
  if(alerts.length === 0){
    empty.textContent = 'Nenhum alerta no momento 🎉';
    return;
  }
  empty.textContent = '';
  alerts.forEach(p => {
    const el = document.createElement('div');
    el.className = 'item';
    el.innerHTML = `<div>
      <strong>${p.nome}</strong>
      <div class="small muted">Estoque: ${p.estoque || 0} — Mínimo: ${p.minimo || 0}</div>
    </div>
    <div>
      <button class="btn" onclick="restockPrompt('${p.id}')">Repor</button>
    </div>`;
    container.appendChild(el);
  });
}

function restockPrompt(prodId){
  const qtd = prompt('Quantidade para adicionar:','10');
  if(qtd === null) return;
  const n = Number(qtd);
  if(Number.isNaN(n) || n <= 0) return alert('Quantidade inválida.');
  registerMovement(prodId, n, currentUser()?.name || 'Operador', 'Entrada');
  renderAlerts();
  renderProductsTable();
  renderDashboardStats();
}

// Add API interaction functions
async function fetchProducts() {
    const response = await fetch('/produtos');
    return response.json();
}

async function fetchAlerts() {
    const response = await fetch('/alertas');
    return response.json();
}

async function registerProduct(product) {
    const response = await fetch('/produtos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(product)
    });
    return response.json();
}

async function updateStock(productId, quantity, type) {
    const endpoint = type === 'entrada' ? '/estoque/entrada' : '/estoque/saida';
    const response = await fetch(endpoint, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ produto_id: productId, quantidade: quantity, tipo: type })
    });
    return response.json();
}

