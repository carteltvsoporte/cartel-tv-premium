class AuthSystem{
constructor(){
this.allowedTickets=new Set(JSON.parse(localStorage.getItem("allowedTickets"))||[
"TV2024-ADMIN","TV2024-PREMIUM","TV2024-STANDARD","TV2024-BASIC",
"TV2024-VIP01","TV2024-VIP02","TV2024-VIP03","TV2024-VIP04",
"TV2024-VIP05","TV2024-VIP06","TV2024-VIP07","TV2024-VIP08",
"TV2024-VIP09","TV2024-VIP10"
]);
this.initializeAuth();
}
initializeAuth(){
this.setupEventListeners();
this.checkSavedTicket();
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
if(this.allowedTickets.has(ticket)){
this.loginWithTicket(ticket);
}else{
this.showNotification("Ticket inválido","error");
}
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
const emailData={
to:"carteltv.soporte@gmail.com",
subject:`Nuevo Ticket CartelTV: ${ticket}`,
body:`Solicitud de nuevo ticket:
Ticket: ${ticket}
Fecha: ${new Date().toLocaleString()}
Navegador: ${navigator.userAgent}
---
Aprobar ticket añadiéndolo a la lista de tickets permitidos.
`
};
this.savePendingTicket(ticket);
console.log("Email simulado:",emailData);
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
return [...this.allowedTickets];
}
}
window.authSystem=new AuthSystem();