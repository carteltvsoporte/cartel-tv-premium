class ContentMode{
constructor(){this.currentMode=localStorage.getItem("content_mode")||"mixed";this.initializeMode();}
initializeMode(){this.setupEventListeners();this.applyMode(this.currentMode);}
setupEventListeners(){document.addEventListener("click",(e)=>{if(e.target.closest(".mode-card")){const mode=e.target.closest(".mode-card").dataset.mode;this.selectMode(mode);}if(e.target.closest(".mode-confirm")){this.confirmMode();}});}
selectMode(mode){document.querySelectorAll(".mode-card").forEach(card=>card.classList.remove("selected"));const selectedCard=document.querySelector(`.mode-card[data-mode="${mode}"]`);if(selectedCard)selectedCard.classList.add("selected");this.tempMode=mode;}
confirmMode(){if(this.tempMode){this.currentMode=this.tempMode;localStorage.setItem("content_mode",this.currentMode);this.applyMode(this.currentMode);configSystem.currentConfig.contentMode=this.currentMode;configSystem.saveConfig();document.getElementById("modeSelector").style.display="none";window.loadContent();}}
applyMode(mode){const sections={movies:mode!=="anime",series:mode!=="anime",anime:mode!=="tmdb"};Object.keys(sections).forEach(section=>{const navLink=document.querySelector(`.nav-link[data-section="${section}"]`);if(navLink)navLink.style.display=sections[section]?"flex":"none";});document.body.classList.remove("mode-tmdb","mode-anime","mode-mixed");document.body.classList.add(`mode-${mode}`);}
showSelector(){document.getElementById("modeSelector").style.display="flex";document.querySelectorAll(".mode-card").forEach(card=>card.classList.remove("selected"));const currentCard=document.querySelector(`.mode-card[data-mode="${this.currentMode}"]`);if(currentCard)currentCard.classList.add("selected");}
getCurrentMode(){return this.currentMode;}
shouldShow(type){if(this.currentMode==="mixed")return true;if(this.currentMode==="tmdb")return type!=="anime";if(this.currentMode==="anime")return type==="anime";return true;}}
window.contentMode=new ContentMode();