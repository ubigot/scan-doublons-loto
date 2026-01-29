/* FINAL OFFLINE VERSION */
const startBtn=document.getElementById("startBtn");
const stopBtn=document.getElementById("stopBtn");
const resetBtn=document.getElementById("resetBtn");
const messageBox=document.getElementById("messageBox");
const countEl=document.getElementById("count");
const lastCodeEl=document.getElementById("lastCode");
const readerWrap=document.getElementById("readerWrap");
const video=document.getElementById("video");

let scanning=false,stream=null,detector=null,rafId=null;
let lastHitValue="",lastHitAt=0;
const codes=new Set(); let count=0;

function beep(freq,dur){
 try{
  const c=new (window.AudioContext||window.webkitAudioContext)();
  const o=c.createOscillator(); const g=c.createGain();
  o.frequency.value=freq;o.connect(g);g.connect(c.destination);g.gain.value=0.08;
  o.start();setTimeout(()=>{o.stop();c.close();},dur);
 }catch(e){}
}

function stopScan(){
 if(rafId) cancelAnimationFrame(rafId);
 if(stream) stream.getTracks().forEach(t=>t.stop());
 scanning=false; stream=null; detector=null;
 lastHitValue=""; lastHitAt=0;
 readerWrap.classList.add("hidden");
 startBtn.disabled=false;
 startBtn.textContent="📷 Scanner le suivant";
}

async function handleCode(code){
 if(codes.has(code)){
  messageBox.className="message warn";
  messageBox.innerHTML="⚠️ Doublon détecté<br>"+code;
  beep(320,180);
 }else{
  codes.add(code); count++;
  countEl.textContent=count;
  lastCodeEl.textContent=code;
  messageBox.className="message ok";
  messageBox.innerHTML="✅ Code valide – nouveau<br>"+code;
  beep(950,120);
 }
 stopScan();
}

async function scanFrame(){
 if(!scanning) return;
 const r=await detector.detect(video);
 if(r.length){
  const v=r[0].rawValue,now=performance.now();
  if(v && (v!==lastHitValue||now-lastHitAt>800)){
   lastHitValue=v; lastHitAt=now;
   handleCode(v); return;
  }
 }
 rafId=requestAnimationFrame(scanFrame);
}

async function startScan(){
 if(scanning) return;
 if(!('BarcodeDetector'in window)){
  messageBox.innerHTML="BarcodeDetector non supporté";return;
 }
 detector=new BarcodeDetector();
 stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:'environment'}});
 video.srcObject=stream; await video.play();
 scanning=true;
 readerWrap.classList.remove("hidden");
 startBtn.disabled=true;
 messageBox.className="message neutral";
 messageBox.innerHTML="📷 Scanne un code-barres";
 rafId=requestAnimationFrame(scanFrame);
}

startBtn.onclick=startScan;
stopBtn.onclick=stopScan;
resetBtn.onclick=()=>{codes.clear();count=0;countEl.textContent=0;
lastCodeEl.textContent="—";messageBox.innerHTML="Réinitialisé";
startBtn.textContent="📷 Scanner un code-barres";};
