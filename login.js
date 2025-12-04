class AuthSystem{
constructor(){
this.allowedTickets=new Set(JSON.parse(localStorage.getItem("allowedTickets"))||[
"TV2025-ADMIN",
"TV2025-JUAN001",
"TV2025-MARIA001",
"TV2025-PEDRO001",
"TV2025-ANA001",
"TV2025-CARLOS001",
"TV2025-LUISA001",
"TV2025-ROBERTO001",
"TV2025-SOFIA001",
"TV2025-DAVID001",
"TV2025-ELENA001"
]);
this.failedAttempts=JSON.parse(localStorage.getItem("failedAttempts"))||{};
this.initializeAuth();
this.setupSecurity();
}
initializeAuth(){
this.setupEventListeners();
this.checkSavedTicket();
}
setupSecurity(){
setInterval(()=>{
const now=Date.now();
const hourAgo=now-60*60*1000;
for(const ip in this.failedAttempts){
if(this.failedAttempts[ip].timestamp<hourAgo){
delete this.failedAttempts[ip];
}
}
localStorage.setItem("failedAttempts",JSON.stringify(this.failedAttempts));
},5*60*1000);
}
setupEventListeners(){
document.getElementById("loginSubmit")?.addEventListener("click",()=>this.handleLogin());
document.getElementById("generateTicket")?.addEventListener("click",()=>this.generateNewTicket());
}
checkSavedTicket(){
const savedTicket=localStorage.getItem("userTicket");
if(savedTicket&&this.allowedTickets.has(savedTicket)){
this.loginWithTicket(savedTicket);
}
}
handleLogin(){
const ticket=document.getElementById("ticketInput").value.trim().toUpperCase();
if(!ticket){
this.showNotification("Ingresa tu ticket","error");
return;
}
if(!this.isValidTicketFormat(ticket)){
this.showNotification("Formato de ticket inválido","error");
return;
}
const clientId=this.getClientId();
if(this.failedAttempts[clientId]&&this.failedAttempts[clientId].count>=5){
const waitTime=Math.ceil((this.failedAttempts[clientId].timestamp+15*60*1000-Date.now())/60000);
this.showNotification(`Demasiados intentos. Espera ${waitTime} minutos.`,"error");
return;
}
if(this.allowedTickets.has(ticket)){
this.loginWithTicket(ticket);
delete this.failedAttempts[clientId];
localStorage.setItem("failedAttempts",JSON.stringify(this.failedAttempts));
}else{
if(!this.failedAttempts[clientId]){
this.failedAttempts[clientId]={count:0,timestamp:Date.now()};
}
this.failedAttempts[clientId].count++;
this.failedAttempts[clientId].timestamp=Date.now();
localStorage.setItem("failedAttempts",JSON.stringify(this.failedAttempts));
this.showNotification("Ticket inválido","error");
}
}
isValidTicketFormat(ticket){
const regex=/^TV[A-Z0-9]+-\w{4,8}$/;
return regex.test(ticket);
}
getClientId(){
let clientId=localStorage.getItem('clientId');
if(!clientId){
clientId='client_'+Date.now()+'_'+Math.random().toString(36).substr(2,9);
localStorage.setItem('clientId',clientId);
}
return clientId;
}
loginWithTicket(ticket){
localStorage.setItem("userTicket",ticket);
document.getElementById("loginScreen").classList.remove("active");
document.getElementById("userName").textContent=`Usuario ${ticket.slice(-4)}`;
document.getElementById("profileDisplayName").textContent=`Usuario ${ticket.slice(-4)}`;
window.currentUser={ticket};
setTimeout(()=>{
if(!localStorage.getItem("content_mode")){
document.getElementById("modeSelector").style.display="flex";
}else{
window.loadContent();
}
},500);
this.showNotification(`¡Bienvenido! Ticket: ${ticket}`,"success");
}
generateNewTicket(){
const newTicket="TV"+Date.now().toString(36).toUpperCase()+"-"+Math.random().toString(36).substr(2,4).toUpperCase();
this.sendTicketByEmail(newTicket);
this.showNotification(`Ticket generado: ${newTicket}. Enviando...`,"info");
}
sendTicketByEmail(ticket){
const emailBody=ticket;
const mailtoLink=`mailto:carteltv.soporte@gmail.com?subject=Nuevo Ticket CartelTV: ${ticket}&body=${encodeURIComponent(emailBody)}`;
window.open(mailtoLink,"_blank");
this.savePendingTicket(ticket);
setTimeout(()=>{
this.showNotification(`Ticket ${ticket} enviado para aprobación.`,"success");
document.getElementById("ticketInput").value=ticket;
},1000);
}
savePendingTicket(ticket){
const pending=JSON.parse(localStorage.getItem("pendingTickets"))||[];
pending.push({
ticket,
timestamp:new Date().toISOString(),
status:"pending"
});
localStorage.setItem("pendingTickets",JSON.stringify(pending));
}
logout(){
localStorage.removeItem("userTicket");
window.currentUser=null;
document.getElementById("loginScreen").classList.add("active");
this.showNotification("Sesión cerrada","info");
}
showNotification(message,type="info"){
const notification=document.getElementById("loginNotification");
notification.textContent=message;
notification.className=`login-notification ${type}`;
notification.style.display="block";
setTimeout(()=>{notification.style.display="none";},3000);
}
approveTicket(ticket){
this.allowedTickets.add(ticket);
localStorage.setItem("allowedTickets",JSON.stringify([...this.allowedTickets]));
const pending=JSON.parse(localStorage.getItem("pendingTickets"))||[];
const index=pending.findIndex(p=>p.ticket===ticket);
if(index>-1){
pending[index].status="approved";
pending[index].approvedAt=new Date().toISOString();
localStorage.setItem("pendingTickets",JSON.stringify(pending));
}
return true;
}
getPendingTickets(){
return JSON.parse(localStorage.getItem("pendingTickets"))||[];
}
getAllowedTickets(){
return[...this.allowedTickets];
}
showAdminPanel(){
const panel=document.createElement('div');
panel.className='admin-panel';
panel.innerHTML=`
<div class="admin-panel-content">
<h3><i class="fas fa-user-shield"></i> Panel de Administración</h3>
<div class="admin-section">
<h4>Tickets Permitidos</h4>
<div class="ticket-list" id="ticketList">
${[...this.allowedTickets].map(ticket=>`
<div class="ticket-item">
<span>${ticket}</span>
<button onclick="authSystem.removeTicket('${ticket}')">
<i class="fas fa-trash"></i>
</button>
</div>
`).join('')}
</div>
</div>
<div class="admin-section">
<h4>Añadir Nuevo Ticket</h4>
<div class="add-ticket-form">
<input type="text" id="newTicketInput" placeholder="TV2025-NUEVO001">
<button onclick="authSystem.addNewTicket()">Añadir Ticket</button>
</div>
</div>
<div class="admin-section">
<h4>Tickets Pendientes</h4>
<div class="pending-tickets" id="pendingTickets">
${this.getPendingTickets().map(ticket=>`
<div class="pending-item">
<span>${ticket.ticket}</span>
<small>${new Date(ticket.timestamp).toLocaleDateString()}</small>
<button onclick="authSystem.approveTicket('${ticket.ticket}')">
<i class="fas fa-check"></i> Aprobar
</button>
</div>
`).join('')}
</div>
</div>
<button class="close-admin" onclick="this.parentElement.remove()">Cerrar</button>
</div>
`;
document.body.appendChild(panel);
}
addNewTicket(){
const input=document.getElementById('newTicketInput');
const ticket=input.value.trim().toUpperCase();
if(!ticket){
alert('Ingresa un ticket válido');
return;
}
if(this.allowedTickets.has(ticket)){
alert('Este ticket ya existe');
return;
}
this.allowedTickets.add(ticket);
localStorage.setItem("allowedTickets",JSON.stringify([...this.allowedTickets]));
this.showNotification(`Ticket ${ticket} añadido`,"success");
this.showAdminPanel();
}
removeTicket(ticket){
if(confirm(`¿Eliminar ticket ${ticket}?`)){
this.allowedTickets.delete(ticket);
localStorage.setItem("allowedTickets",JSON.stringify([...this.allowedTickets]));
this.showNotification(`Ticket ${ticket} eliminado`,"success");
this.showAdminPanel();
}
}
}
window.authSystem=new AuthSystem();
window.adminPanel=function(){
authSystem.showAdminPanel();
};