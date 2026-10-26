const GK='gruppcentral_v4_groups',RK='gruppcentral_v4_rooms';let groups=read(GK,[]),rooms=read(RK,[]);if(!groups.length){groups=read('gruppcentral_v3_groups',[]);if(groups.length)localStorage.setItem(GK,JSON.stringify(groups))}let editId=null,randSel=new Set(),room=null,sel=null,seatSel=new Set(),seatOff=new Set(),inlineSel=new Set(),inlineGroupsConfirmed=false,dragStudent=null,canvasZoom=100,panMode=false,undoStack=[],autosaveTimer=null,toolsVisible=true,studentsVisible=true,redoStack=[],workMode='build',selectedStudent=null,ruleDrafts=[],editingRuleIndex=-1;const $=x=>document.getElementById(x);function read(k,d){try{return JSON.parse(localStorage.getItem(k)||JSON.stringify(d))}catch{return d}}function save(){localStorage.setItem(GK,JSON.stringify(groups));localStorage.setItem(RK,JSON.stringify(rooms))}function uid(){return Date.now().toString(36)+Math.random().toString(36).slice(2,6)}function esc(s){return String(s).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))}function norm(s){return s.trim().toLowerCase()}function toast(s){$('toast').textContent=s;$('toast').style.display='block';setTimeout(()=>$('toast').style.display='none',2200)}
function updateHomeStatus(){let g=$('homeGroupCount'),r=$('homeRoomCount');if(g)g.textContent=groups.length?`${groups.length} elevgrupper sparade`:'Hantera elevlistor';if(r)r.textContent=rooms.length?`${rooms.length} klassrum sparade`:'Bygg rum och placera elever'}
function openWorkspace(v){$('homeScreen').classList.add('hide');$('workspaceApp').classList.remove('hide');document.body.classList.add('workspaceFocus');view(v);history.replaceState({view:v},'',`#${v}`);window.scrollTo(0,0)}
function goHome(){if(room&&$('rooms')&&!$('rooms').classList.contains('hide')){try{saveRoom()}catch{}}$('workspaceApp').classList.add('hide');$('homeScreen').classList.remove('hide');document.body.classList.remove('workspaceFocus');updateHomeStatus();history.replaceState({view:'home'},' ',location.pathname+location.search);window.scrollTo(0,0)}
document.querySelectorAll('nav button').forEach(b=>b.onclick=()=>view(b.dataset.v));function view(v){document.querySelectorAll('nav button').forEach(b=>b.classList.toggle('active',b.dataset.v===v));document.querySelectorAll('.view').forEach(x=>x.classList.add('hide'));$(v).classList.remove('hide');let m={groups:['Elevgrupper','Hantera grupper lokalt på enheten.'],random:['Slumpa','Skapa grupper om tre elever.'],rooms:['Klassrum','Bygg rum och skapa placeringar.'],backup:['Import & backup','Importera Word eller flytta allt mellan enheter.']}[$(v).id];$('title').textContent=m[0];$('sub').textContent=m[1];if(v==='random')renderRandom();if(v==='rooms'){closeEditor();renderRooms()}}
function renderGroups(){let q=norm($('search').value),a=groups.filter(g=>!q||norm(g.name+' '+g.grade+' '+g.students.join(' ')).includes(q));$('groupCards').innerHTML=a.length?a.map(g=>`<article class="groupCard"><h3>${esc(g.name)}</h3><div class="meta">${esc(g.grade)} · ${esc(g.category)} · ${g.students.length} elever</div><div class="names">${g.students.slice(0,10).map(esc).join('<br>')}</div><button class="soft" onclick="openGroup('${g.id}')">Redigera</button> <button class="danger" onclick="delGroup('${g.id}')">Ta bort</button></article>`).join(''):'<div class="card">Inga grupper ännu.</div>'}$('search').oninput=renderGroups;function openGroup(id=null){editId=id;let g=groups.find(x=>x.id===id)||{grade:'',category:'',name:'',students:[]};$('modalTitle').textContent=id?'Redigera grupp':'Ny grupp';$('gGrade').value=g.grade;$('gCat').value=g.category;$('gName').value=g.name;$('gStudents').value=g.students.join('\n');$('modal').classList.remove('hide')}function closeGroup(){$('modal').classList.add('hide')}function saveGroup(){let o={grade:$('gGrade').value.trim(),category:$('gCat').value.trim(),name:$('gName').value.trim(),students:[...new Set($('gStudents').value.split(/\r?\n|;|\t/).map(x=>x.trim()).filter(Boolean))]};if(!o.grade||!o.category||!o.name||!o.students.length)return alert('Fyll i alla fält.');if(editId)Object.assign(groups.find(x=>x.id===editId),o);else groups.push({id:uid(),...o});save();closeGroup();renderGroups();updateHomeStatus()}function delGroup(id){if(confirm('Ta bort gruppen?')){groups=groups.filter(x=>x.id!==id);save();renderGroups();updateHomeStatus()}}
function studentList(set){let m=new Map();groups.filter(g=>set.has(g.id)).forEach(g=>g.students.forEach(s=>{let k=norm(s);if(!m.has(k))m.set(k,s)}));return[...m.values()]}function checkHtml(set,fn){return groups.map(g=>`<label class="check"><input type="checkbox" ${set.has(g.id)?'checked':''} onchange="${fn}('${g.id}')"><span><b>${esc(g.name)}</b><br><small>${esc(g.grade)} · ${g.students.length} elever</small></span></label>`).join('')}function toggleRandom(id){randSel.has(id)?randSel.delete(id):randSel.add(id);renderRandom()}function renderRandom(){$('randomChecks').innerHTML=checkHtml(randSel,'toggleRandom');$('randomInfo').textContent=`${studentList(randSel).length} elever valda`}function shuffle(a){a=[...a];for(let i=a.length-1;i;i--){let j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}function randomize(){let s=shuffle(studentList(randSel)),n=Math.ceil(s.length/3),a=Array.from({length:n},()=>[]);s.forEach((x,i)=>a[i%n].push(x));$('randomResult').innerHTML=a.map((g,i)=>`<div class="result"><h3>Grupp ${i+1}</h3><ul>${g.map(x=>`<li>${esc(x)}</li>`).join('')}</ul></div>`).join('')}
function snapshotRoom(){if(!room)return;undoStack.push(JSON.stringify(room));if(undoStack.length>30)undoStack.shift();updateUndoButton()}
function updateUndoButton(){let b=$('undoBtn');if(b)b.disabled=!undoStack.length}
function undoLast(){if(!room||!undoStack.length)return;room=JSON.parse(undoStack.pop());sel=null;saveRoom();renderCanvas();updateUndoButton();toast('Senaste ändringen ångrades.')}
function clearUndo(){undoStack=[];updateUndoButton()}
function setSaveStatus(state,text){let el=$('saveStatus');if(!el)return;el.className=`saveStatus ${state}`;let span=el.querySelector('span');if(span)span.textContent=text}
function scheduleAutosave(){if(!room)return;setSaveStatus('saving','Sparar…');clearTimeout(autosaveTimer);autosaveTimer=setTimeout(()=>saveRoom(false),550)}
function toggleToolsPanel(){toolsVisible=!toolsVisible;let b=$('classroomBuilder'),btn=$('toggleToolsBtn');b?.classList.toggle('toolsCollapsed',!toolsVisible);btn?.classList.toggle('active',toolsVisible);btn.textContent=toolsVisible?'＋ Verktyg':'＋ Visa verktyg';requestAnimationFrame(()=>fitToolbarLayout())}
function toggleStudentsPanel(){studentsVisible=!studentsVisible;let b=$('classroomBuilder'),btn=$('toggleStudentsBtn');b?.classList.toggle('studentsCollapsed',!studentsVisible);btn?.classList.toggle('active',studentsVisible);btn.textContent=studentsVisible?'👥 Elever':'👥 Visa elever';requestAnimationFrame(()=>fitToolbarLayout())}
function fitToolbarLayout(){let c=$('canvas');if(c)applyZoom(c)}
function blank(){return{id:uid(),name:'Nytt klassrum',tables:[],objects:[]}}function renderRooms(){$('roomCards').innerHTML=rooms.length?rooms.map(r=>`<article class="roomCard"><h3>${esc(r.name)}</h3><div class="meta">${r.tables.length} bord · ${capacity(r)} platser</div><p><button class="primary" onclick="editRoom('${r.id}')">Öppna</button> <button class="danger" onclick="delRoom('${r.id}')">Ta bort</button></p></article>`).join(''):'<div class="card">Inga klassrum ännu.</div>'}function newRoom(){room=ensureRoom52(blank());openEditor()}function editRoom(id){room=ensureRoom52(JSON.parse(JSON.stringify(rooms.find(x=>x.id===id))));openEditor()}function openEditor(){$('roomList').classList.add('hide');$('editor').classList.remove('hide');$('seater').classList.add('hide');$('roomName').value=room.name;$('roomName').oninput=()=>scheduleAutosave();sel=null;clearUndo();setSaveStatus('saved','Sparad');if(matchMedia('(max-width:700px)').matches){toolsVisible=false;studentsVisible=false}let b=$('classroomBuilder');b?.classList.toggle('toolsCollapsed',!toolsVisible);b?.classList.toggle('studentsCollapsed',!studentsVisible);$('toggleToolsBtn')?.classList.toggle('active',toolsVisible);$('toggleStudentsBtn')?.classList.toggle('active',studentsVisible);$('toggleToolsBtn').textContent=toolsVisible?'＋ Verktyg':'＋ Visa verktyg';$('toggleStudentsBtn').textContent=studentsVisible?'👥 Elever':'👥 Visa elever';renderPlacementControls();setWorkMode('build',false);renderCanvas();setTimeout(()=>fitCanvas(),40)}function closeEditor(){if(room)saveRoom(false);$('editor').classList.add('hide');$('seater').classList.add('hide');$('roomList').classList.remove('hide');room=null;renderRooms()}function saveRoom(manual=false){if(!room)return;try{room.name=$('roomName').value.trim()||'Klassrum';let i=rooms.findIndex(x=>x.id===room.id);if(i<0)rooms.push(JSON.parse(JSON.stringify(room)));else rooms[i]=JSON.parse(JSON.stringify(room));save();updateHomeStatus();setSaveStatus('saved','Sparad');if(manual)toast('Klassrummet sparades.')}catch(e){setSaveStatus('error','Kunde inte spara')}}function delRoom(id){if(confirm('Ta bort klassrummet?')){rooms=rooms.filter(x=>x.id!==id);save();renderRooms();updateHomeStatus()}}function capacity(r){return r.tables.reduce((a,t)=>a+t.seats,0)}function addTable(type){if(room?.layoutLocked)return toast('Lås upp ritningen först.');snapshotRoom();let seats=type==='square'?1:type==='rect'?2:4;room.tables.push({id:uid(),type,seats,x:45+(room.tables.length*27)%500,y:55+(room.tables.length*35)%320,rotation:0,scale:1,names:Array(seats).fill('')});sel={kind:'table',id:room.tables.at(-1).id};renderCanvas()}function addObject(type){if(room?.layoutLocked)return toast('Lås upp ritningen först.');snapshotRoom();room.objects.push({id:uid(),type,x:type==='board'?360:type==='wall'?390:35,y:type==='board'?15:type==='wall'?320:520,rotation:0,scale:1});sel={kind:'object',id:room.objects.at(-1).id};renderCanvas()}function item(){return sel?(sel.kind==='table'?room.tables:room.objects).find(x=>x.id===sel.id):null}
function renderCanvas(id='canvas',result=false){let c=$(id);if(!result&&room)scheduleAutosave();c.innerHTML=room.objects.map(o=>`<div class="obj labelObj ${o.type} ${sel?.id===o.id&&!result?'selected':''}" data-kind="object" data-id="${o.id}" style="left:${o.x}px;top:${o.y}px;transform:rotate(${o.rotation||0}deg) scale(${o.scale||1})">${o.type==='board'?'WHITEBOARD':o.type==='door'?'DÖRR':''}${sel?.id===o.id&&!result?'<span class="rotateStem"></span><button class="rotateHandle" data-rotate-id="'+o.id+'" aria-label="Rotera">↻</button>':''}</div>`).join('')+room.tables.map(t=>tableHTML(t,result)).join('');if(!result){applyZoom(c);bindCanvasPan();bindDrag(c);bindRotateHandles(c);bindSeatClicks(c);bindNameDrag(c);renderInlinePanel()}else applyZoom(c);if($('stats'))$('stats').textContent=`${room.tables.length} bord · ${capacity(room)} platser`;inspect()}
function tableHTML(t,result){let names=Array.from({length:t.seats},(_,i)=>t.names?.[i]||''),inside=t.type==='rect'?`<div class="rectGrid n${t.seats}">${names.map(n=>`<div class="seat dragName" draggable="${!!n}" data-student="${n?encodeURIComponent(n):''}">${esc(n)||(result?'':'Tom')}</div>`).join('')}</div>`:t.type==='square'?`<div class="seat dragName" draggable="${!!names[0]}" data-student="${names[0]?encodeURIComponent(names[0]):''}">${esc(names[0])||(result?'':'Tom')}</div>`:names.map((n,i)=>{let a=-Math.PI/2+2*Math.PI*i/t.seats,x=Math.cos(a)*31,y=Math.sin(a)*34;return`<div class="seat roundSeat dragName" draggable="${!!n}" data-student="${n?encodeURIComponent(n):''}" style="--x:${x}px;--y:${y}px">${esc(n)||(result?'':'Tom')}</div>`}).join('');let base=t.type==='rect'?[180,86]:t.type==='square'?[76,76]:[132,132],sc=t.scale||1;return`<div class="obj ${t.type} ${sel?.id===t.id&&!result?'selected':''}" data-kind="table" data-id="${t.id}" style="left:${t.x}px;top:${t.y}px;width:${base[0]*sc}px;height:${base[1]*sc}px;transform:rotate(${t.rotation}deg)"><div class="shape" style="">${inside}</div>${sel?.id===t.id&&!result?`<span class="rotateStem"></span><button class="rotateHandle" data-rotate-id="${t.id}" aria-label="Rotera">↻</button>`:''}</div>`}
function bindDrag(c){c.querySelectorAll('.obj').forEach(el=>{el.addEventListener('pointerdown',e=>{if(e.target.closest('.dragName')&&e.target.dataset.student)return;e.preventDefault();e.stopPropagation();sel={kind:el.dataset.kind,id:el.dataset.id};c.querySelectorAll('.obj').forEach(x=>x.classList.toggle('selected',x===el));inspect();snapshotRoom();let it=item(),startX=e.clientX,startY=e.clientY,origX=it.x,origY=it.y,scale=c.getBoundingClientRect().width/c.offsetWidth||1;el.classList.add('dragging');el.setPointerCapture(e.pointerId);const move=ev=>{it.x=Math.max(0,Math.min(c.offsetWidth-40,origX+(ev.clientX-startX)/scale));it.y=Math.max(0,Math.min(c.offsetHeight-30,origY+(ev.clientY-startY)/scale));el.style.left=it.x+'px';el.style.top=it.y+'px'};const up=()=>{el.classList.remove('dragging');el.removeEventListener('pointermove',move);el.removeEventListener('pointerup',up);el.removeEventListener('pointercancel',up)};el.addEventListener('pointermove',move);el.addEventListener('pointerup',up);el.addEventListener('pointercancel',up)})})}
function inspect(){let p=$('inspect');if(!p||!sel){if(p)p.innerHTML='Välj en figur.';return}let x=item();if(sel.kind==='object'){let label=x.type==='board'?'Whiteboard':x.type==='door'?'Dörr':'Skiljevägg';p.innerHTML=`<h3>${label}</h3><label>Storlek i procent</label><div class="sizeNumber"><input type="number" min="60" max="180" value="${Math.round((x.scale||1)*100)}" onchange="resizeSelected(this.value)"><span>%</span></div><button class="soft reset100" onclick="resizeSelected(100)">Återställ till 100 %</button><label>Storlek i procent</label><div class="sizeNumber"><input type="number" min="70" max="160" value="${Math.round((x.scale||1)*100)}" onchange="resizeSelected(this.value)"><span>%</span></div><button class="soft reset100" onclick="resizeSelected(100)">Återställ till 100 %</button><label>Rotation</label><div class="rotationNumber"><input type="range" min="0" max="359" value="${x.rotation||0}" oninput="previewAngle(this.value)" onchange="commitAngle(this.value)"><input type="number" min="0" max="359" value="${Math.round(x.rotation||0)}" onchange="commitAngle(this.value)"></div><div class="rotationButtons"><button onclick="setAngle(0)">0°</button><button onclick="setAngle(45)">45°</button><button onclick="setAngle(90)">90°</button><button onclick="setAngle(135)">135°</button></div><div class="rotationHint">Välj valfri vinkel 0–359°.</div><p><button class="danger" onclick="removeItem()">Ta bort</button></p>`;return}p.innerHTML=`<h3>Bord</h3><label>Form</label><select onchange="shape(this.value)"><option value="rect" ${x.type==='rect'?'selected':''}>Rektangulärt</option><option value="square" ${x.type==='square'?'selected':''}>Kvadratiskt, 1 plats</option><option value="round" ${x.type==='round'?'selected':''}>Runt</option></select><label>Platser</label><div class="controls"><button class="soft" onclick="seats(-1)" ${x.type==='square'||x.seats<=2?'disabled':''}>−</button><b>${x.seats}</b><button class="soft" onclick="seats(1)" ${x.type==='square'||x.seats>=6?'disabled':''}>+</button></div><label>Storlek i procent</label><div class="sizeNumber"><input type="number" min="70" max="160" value="${Math.round((x.scale||1)*100)}" onchange="resizeSelected(this.value)"><span>%</span></div><button class="soft reset100" onclick="resizeSelected(100)">Återställ till 100 %</button><label>Rotation</label><div class="rotationNumber"><input type="range" min="0" max="359" value="${x.rotation||0}" oninput="previewAngle(this.value)" onchange="commitAngle(this.value)"><input type="number" min="0" max="359" value="${Math.round(x.rotation||0)}" onchange="commitAngle(this.value)"></div><div class="rotationButtons"><button onclick="setAngle(0)">0°</button><button onclick="setAngle(45)">45°</button><button onclick="setAngle(90)">90°</button><button onclick="setAngle(135)">135°</button></div><div class="rotationHint">Välj valfri vinkel 0–359°.</div><p><button class="danger" onclick="removeItem()">Ta bort</button></p>`}function shape(v){if(room?.layoutLocked)return toast('Lås upp ritningen först.');snapshotRoom();let x=item();x.type=v;x.seats=v==='square'?1:Math.max(2,Math.min(6,x.seats));x.names=Array(x.seats).fill('');renderCanvas()}function seats(d){if(room?.layoutLocked)return toast('Lås upp ritningen först.');snapshotRoom();let x=item();x.seats=Math.max(2,Math.min(6,x.seats+d));x.names=(x.names||[]).slice(0,x.seats);while(x.names.length<x.seats)x.names.push('');renderCanvas()}function rotate(v){commitAngle(v)}function previewAngle(v){let x=item();if(!x)return;x.rotation=((+v%360)+360)%360;let el=document.querySelector(`#canvas [data-id=\"${x.id}\"]`);if(el)el.style.transform=`rotate(${x.rotation}deg)`;let n=$('inspect')?.querySelector('.rotationNumber input[type=number]');if(n)n.value=Math.round(x.rotation)}function commitAngle(v){if(room?.layoutLocked)return toast('Lås upp ritningen först.');snapshotRoom();let x=item();if(!x)return;x.rotation=((+v%360)+360)%360;renderCanvas()}function setAngle(v){commitAngle(v)}function resizeSelected(v){if(room?.layoutLocked)return toast('Lås upp ritningen först.');snapshotRoom();let x=item();if(!x)return;let min=sel.kind==='table'?70:60,max=sel.kind==='table'?160:180;x.scale=Math.max(min,Math.min(max,+v||100))/100;renderCanvas()}function removeItem(){if(room?.layoutLocked)return toast('Lås upp ritningen först.');snapshotRoom();if(sel.kind==='table')room.tables=room.tables.filter(x=>x.id!==sel.id);else room.objects=room.objects.filter(x=>x.id!==sel.id);sel=null;renderCanvas()}

function renderInlinePanel(){if(!room||!$('inlineChecks'))return;$('inlineChecks').innerHTML=groups.map(g=>`<label class="inlineCheck"><input type="checkbox" ${inlineSel.has(g.id)?'checked':''} onchange="toggleInline('${g.id}')"><span><b>${esc(g.name)}</b><br>${esc(g.grade)} · ${g.students.length}</span></label>`).join('')||'<span class="meta">Importera elevgrupper först.</span>';let chosen=groups.filter(g=>inlineSel.has(g.id)),count=inlineStudents().length,summary=chosen.length?`${chosen.map(g=>g.name).join(', ')} · ${count} elever`:'Ingen grupp vald';$('selectedGroupSummary').textContent=summary;$('chosenGroupsText').textContent=summary;$('groupPickerArea').classList.toggle('hide',inlineGroupsConfirmed);$('chosenGroupsCompact').classList.toggle('hide',!inlineGroupsConfirmed);renderUnassigned()}
function confirmInlineGroups(){if(!inlineSel.size)return toast('Välj minst en elevgrupp.');inlineGroupsConfirmed=true;renderInlinePanel()}
function changeInlineGroups(){inlineGroupsConfirmed=false;renderInlinePanel()}
function toggleInline(id){inlineSel.has(id)?inlineSel.delete(id):inlineSel.add(id);renderInlinePanel()}
function assignedNames(){return new Set(room.tables.flatMap(t=>t.names||[]).filter(Boolean).map(norm))}
function inlineStudents(){return studentList(inlineSel)}
function renderUnassigned(){if(!$('unassigned')||!room)return;let used=assignedNames(),left=inlineStudents().filter(n=>!used.has(norm(n)));$('unassigned').innerHTML=left.length?left.map(n=>`<button class="unassignedName dragName" draggable="true" data-student="${encodeURIComponent(n)}" title="Dra namnet till en plats eller klicka för första tomma plats" onclick="placeFirst('${encodeURIComponent(n)}')">${esc(n)}</button>`).join(''):'<span class="meta">Alla valda elever är placerade.</span>';bindNameDrag(document)}
function inlineRandomize(){snapshotRoom();let s=shuffle(inlineStudents()),cap=capacity(room);if(!s.length)return toast('Välj minst en elevgrupp.');if(s.length>cap)return alert(`Det saknas ${s.length-cap} platser.`);let i=0;room.tables.forEach(t=>t.names=Array.from({length:t.seats},()=>s[i++]||''));saveRoom();renderCanvas()}
function clearSeating(){snapshotRoom();room.tables.forEach(t=>t.names=Array(t.seats).fill(''));saveRoom();renderCanvas()}
function placeFirst(enc){snapshotRoom();let name=decodeURIComponent(enc);for(let t of room.tables){let i=(t.names||[]).findIndex(x=>!x);if(i>=0){t.names[i]=name;saveRoom();renderCanvas();return}}toast('Det finns ingen tom plats.')}
function bindSeatClicks(c){c.querySelectorAll('.tableObj .seat').forEach((el,i)=>{el.classList.toggle('clickable',!!el.textContent.trim()&&!['Tom','Tom plats'].includes(el.textContent.trim()));el.onclick=e=>{if(el.dataset.justDragged)return;e.stopPropagation();let tableEl=el.closest('.tableObj'),t=room.tables.find(x=>x.id===tableEl.dataset.id),seats=[...tableEl.querySelectorAll('.seat')],idx=seats.indexOf(el);if(t?.names?.[idx]){snapshotRoom();t.names[idx]='';saveRoom();renderCanvas()}}})}

function findStudentLocation(name){for(let t of room.tables){let i=(t.names||[]).findIndex(x=>norm(x)===norm(name));if(i>=0)return{table:t,index:i}}return null}
function removeStudentEverywhere(name){room.tables.forEach(t=>{t.names=(t.names||[]).map(x=>norm(x)===norm(name)?'':x)})}
function moveStudentToSeat(name,tableId,seatIndex){snapshotRoom();let target=room.tables.find(t=>t.id===tableId);if(!target)return;let source=findStudentLocation(name),displaced=target.names[seatIndex]||'';if(source)source.table.names[source.index]='';else removeStudentEverywhere(name);target.names[seatIndex]=name;if(displaced&&norm(displaced)!==norm(name)&&source)source.table.names[source.index]=displaced;saveRoom();renderCanvas()}
function seatTargetAt(x,y){let el=document.elementFromPoint(x,y);return el?.closest?.('.tableObj .seat')||null}
function unassignedTargetAt(x,y){let el=document.elementFromPoint(x,y);return el?.closest?.('#unassigned')||null}
function dropNameAt(name,x,y){let seat=seatTargetAt(x,y);if(seat){let tableEl=seat.closest('.tableObj'),seats=[...tableEl.querySelectorAll('.seat')],idx=seats.indexOf(seat);moveStudentToSeat(name,tableEl.dataset.id,idx);return}if(unassignedTargetAt(x,y)){snapshotRoom();removeStudentEverywhere(name);saveRoom();renderCanvas()}}
function bindNameDrag(root){root.querySelectorAll?.('.dragName[data-student]').forEach(el=>{if(el.dataset.dragBound)return;el.dataset.dragBound='1';el.addEventListener('pointerdown',e=>{let enc=el.dataset.student;if(!enc)return;let name=decodeURIComponent(enc),sx=e.clientX,sy=e.clientY,moved=false,ghost=null;dragStudent=name;e.stopPropagation();el.setPointerCapture?.(e.pointerId);const move=ev=>{if(!moved&&Math.hypot(ev.clientX-sx,ev.clientY-sy)<6)return;moved=true;ev.preventDefault();if(!ghost){ghost=document.createElement('div');ghost.className='namePointerGhost';ghost.textContent=name;document.body.appendChild(ghost);el.classList.add('draggingName')}ghost.style.left=ev.clientX+'px';ghost.style.top=ev.clientY+'px';document.querySelectorAll('.nameDropHover').forEach(x=>x.classList.remove('nameDropHover'));let target=seatTargetAt(ev.clientX,ev.clientY)||unassignedTargetAt(ev.clientX,ev.clientY);target?.classList.add('nameDropHover')};const up=ev=>{el.removeEventListener('pointermove',move);el.removeEventListener('pointerup',up);el.removeEventListener('pointercancel',up);document.querySelectorAll('.nameDropHover').forEach(x=>x.classList.remove('nameDropHover'));ghost?.remove();el.classList.remove('draggingName');if(moved){ev.preventDefault();dropNameAt(name,ev.clientX,ev.clientY);el.dataset.justDragged='1';setTimeout(()=>delete el.dataset.justDragged,250)}dragStudent=null};el.addEventListener('pointermove',move);el.addEventListener('pointerup',up);el.addEventListener('pointercancel',up)});el.addEventListener('click',e=>{if(el.dataset.justDragged){e.preventDefault();e.stopPropagation()}})});root.querySelectorAll?.('.tableObj .seat').forEach(el=>{el.ondragover=e=>{e.preventDefault();el.classList.add('dropTarget')};el.ondragleave=()=>el.classList.remove('dropTarget');el.ondrop=e=>{e.preventDefault();e.stopPropagation();el.classList.remove('dropTarget');let name=dragStudent||e.dataTransfer?.getData('text/plain');if(!name)return;let tableEl=el.closest('.tableObj'),seats=[...tableEl.querySelectorAll('.seat')],idx=seats.indexOf(el);moveStudentToSeat(name,tableEl.dataset.id,idx)}})}
function applyZoom(c=$('canvas')){if(!c)return;c.style.zoom=(canvasZoom/100);let z=$('zoomValue');if(z)z.value=Math.round(canvasZoom)}
function setZoom(v){canvasZoom=Math.max(25,Math.min(200,+v||100));applyZoom($('canvas'));if($('seatCanvas'))applyZoom($('seatCanvas'))}
function zoomBy(delta){setZoom(canvasZoom+delta)}
function fitCanvas(){let stage=$('canvas')?.parentElement,c=$('canvas');if(!stage||!c)return;let availableW=Math.max(200,stage.clientWidth-30),availableH=Math.max(200,stage.clientHeight-30),z=Math.min(100,availableW/c.offsetWidth*100,availableH/c.offsetHeight*100);setZoom(Math.max(25,Math.floor(z/5)*5))}
function togglePanMode(){panMode=!panMode;let st=$('canvas')?.parentElement,b=$('panBtn');st?.classList.toggle('panMode',panMode);b?.classList.toggle('active',panMode)}
function bindCanvasPan(){let st=$('canvas')?.parentElement;if(!st||st.dataset.panBound)return;st.dataset.panBound='1';st.addEventListener('pointerdown',e=>{if(!panMode||e.target.closest('.canvasZoomBar'))return;e.preventDefault();st.classList.add('panning');let sx=e.clientX,sy=e.clientY,sl=st.scrollLeft,stp=st.scrollTop;st.setPointerCapture?.(e.pointerId);const move=ev=>{st.scrollLeft=sl-(ev.clientX-sx);st.scrollTop=stp-(ev.clientY-sy)};const up=()=>{st.classList.remove('panning');st.removeEventListener('pointermove',move);st.removeEventListener('pointerup',up);st.removeEventListener('pointercancel',up)};st.addEventListener('pointermove',move);st.addEventListener('pointerup',up);st.addEventListener('pointercancel',up)});st.addEventListener('wheel',e=>{if(!e.ctrlKey&&!e.metaKey)return;e.preventDefault();zoomBy(e.deltaY>0?-10:10)},{passive:false})}
function normalizeAngle(a){return(Math.round(a)%360+360)%360}
function bindRotateHandles(c){c.querySelectorAll('.rotateHandle').forEach(h=>{h.onpointerdown=e=>{e.preventDefault();e.stopPropagation();let host=h.closest('.obj'),it=item();if(!host||!it)return;snapshotRoom();h.setPointerCapture?.(e.pointerId);h.classList.add('rotating');let badge=document.createElement('div');badge.className='angleBadge';document.body.appendChild(badge);const update=ev=>{let r=host.getBoundingClientRect(),cx=r.left+r.width/2,cy=r.top+r.height/2,angle=normalizeAngle(Math.atan2(ev.clientY-cy,ev.clientX-cx)*180/Math.PI+90);it.rotation=angle;host.style.transform=`rotate(${angle}deg)${sel?.kind==='object'?' scale('+(it.scale||1)+')':''}`;badge.textContent=angle+'°';badge.style.left=ev.clientX+'px';badge.style.top=ev.clientY+'px'};const done=()=>{h.classList.remove('rotating');badge.remove();h.onpointermove=null;h.onpointerup=null;h.onpointercancel=null;saveRoom();renderCanvas()};h.onpointermove=update;h.onpointerup=done;h.onpointercancel=done}})}
function toggleRoomFullscreen(){let el=$('classroomBuilder'),bar=document.querySelector('.canvasZoomBar');if(bar&&!el.contains(bar))el.prepend(bar);if(document.fullscreenElement){document.exitFullscreen().catch(()=>fallbackFullscreen(false));return}if(el.requestFullscreen){el.requestFullscreen().catch(()=>fallbackFullscreen(true))}else fallbackFullscreen(!el.classList.contains('fullscreenFallback'))}
function fallbackFullscreen(on){let el=$('classroomBuilder');el.classList.toggle('fullscreenFallback',on);document.body.classList.toggle('fullscreenLock',on);$('exitFullscreen').classList.toggle('hide',!on)}
document.addEventListener('fullscreenchange',()=>{let on=!!document.fullscreenElement;$('exitFullscreen')?.classList.toggle('hide',!on);document.body.classList.toggle('fullscreenLock',on);if(on){renderInlinePanel();bindCanvasPan()}});
function seatStudents(){if(!room.tables.length)return alert('Lägg till bord först.');saveRoom();$('editor').classList.add('hide');$('seater').classList.remove('hide');$('seatTitle').textContent=room.name;$('seatChecks').innerHTML=checkHtml(seatSel,'toggleSeat');renderAttend();$('seatCanvas').innerHTML=''}function toggleSeat(id){seatSel.has(id)?seatSel.delete(id):seatSel.add(id);$('seatChecks').innerHTML=checkHtml(seatSel,'toggleSeat');renderAttend()}function renderAttend(){let s=studentList(seatSel);$('attendance').innerHTML=s.map(x=>`<button class="chip ${seatOff.has(norm(x))?'off':''}" onclick="toggleOff('${encodeURIComponent(x)}')">${esc(x)}</button>`).join('')}function toggleOff(x){x=decodeURIComponent(x);let k=norm(x);seatOff.has(k)?seatOff.delete(k):seatOff.add(k);renderAttend()}function backEditor(){$('seater').classList.add('hide');$('editor').classList.remove('hide');renderCanvas()}function doSeating(){snapshotRoom();let s=shuffle(studentList(seatSel).filter(x=>!seatOff.has(norm(x))));if(s.length>capacity(room))return alert(`Det saknas ${s.length-capacity(room)} platser.`);let i=0;room.tables.forEach(t=>t.names=Array.from({length:t.seats},()=>s[i++]||''));saveRoom();renderCanvas('seatCanvas',true)}
$('wordFile').onchange=async e=>{try{let a=await parseDocx(e.target.files[0]);groups.push(...a);save();renderGroups();toast(`${a.length} grupper importerades.`)}catch{alert('Kunde inte läsa Word-filen.')}};async function parseDocx(f){let z=await JSZip.loadAsync(f),xml=await z.file('word/document.xml').async('text'),d=new DOMParser().parseFromString(xml,'application/xml'),W='http://schemas.openxmlformats.org/wordprocessingml/2006/main',out=[];for(let t of [...d.getElementsByTagNameNS(W,'tbl')]){let rows=[...t.getElementsByTagNameNS(W,'tr')].map(r=>[...r.children].filter(x=>x.localName==='tc').map(c=>[...c.getElementsByTagNameNS(W,'p')].map(p=>[...p.getElementsByTagNameNS(W,'t')].map(x=>x.textContent).join('')).filter(Boolean).join('\n')));let h=rows[0]&&new Set(rows[0]).size===1?1:0,title=h?rows[0][0]:'';for(let c=0;c<Math.max(...rows.map(r=>r.length));c++){let students=[];for(let r=h+1;r<rows.length;r++)students.push(...(rows[r]?.[c]||'').split('\n').filter(Boolean));if(students.length)out.push({id:uid(),grade:(title.match(/\d/)?.[0]?'Årskurs '+title.match(/\d/)[0]:'Okänd årskurs'),category:norm(title).includes('idrott')?'Idrott':'Importerad Word',name:rows[h]?.[c]||'Grupp',students})}}return out}function exportData(){download(new Blob([JSON.stringify({version:4.2,groups,rooms},null,2)],{type:'application/json'}),'gruppcentral-backup.json')}function download(b,n){let a=document.createElement('a');a.href=URL.createObjectURL(b);a.download=n;a.click()}$('backupFile').onchange=async e=>{try{let o=JSON.parse(await e.target.files[0].text());groups=o.groups||[];rooms=o.rooms||[];save();renderGroups();renderRooms();updateHomeStatus();toast('Backup importerad.')}catch{alert('Felaktig backupfil.')}};if('serviceWorker'in navigator)navigator.serviceWorker.register('./service-worker.js').catch(()=>{});renderGroups();renderRooms();updateHomeStatus();

/* Gruppcentralen 5.2: låsning och sparade placeringar */
function ensureRoom52(r){if(!r)return r;r.layoutLocked=!!r.layoutLocked;r.placements=Array.isArray(r.placements)?r.placements:[];r.activePlacementId=r.activePlacementId||'';(r.tables||[]).forEach(t=>{t.names=Array.isArray(t.names)?t.names.slice(0,t.seats):Array(t.seats).fill('');while(t.names.length<t.seats)t.names.push('');t.lockedSeats=Array.isArray(t.lockedSeats)?t.lockedSeats.slice(0,t.seats).map(Boolean):Array(t.seats).fill(false);while(t.lockedSeats.length<t.seats)t.lockedSeats.push(false)});return r}
function toggleLayoutLock(){if(!room)return;snapshotRoom();room.layoutLocked=!room.layoutLocked;scheduleAutosave();renderCanvas();toast(room.layoutLocked?'Klassrumsritningen är låst. Elever kan fortfarande flyttas.':'Klassrumsritningen är upplåst.')}
function updateLayoutLockUI(){let b=$('layoutLockBtn'),builder=$('classroomBuilder');if(!b||!room)return;b.textContent=room.layoutLocked?'🔒 Ritning låst':'🔓 Lås ritning';b.classList.toggle('active',room.layoutLocked);builder?.classList.toggle('layoutLocked',room.layoutLocked)}
function placementSnapshot(name){return{id:uid(),name:name||'Placering',savedAt:new Date().toISOString(),tables:(room.tables||[]).map(t=>({id:t.id,names:[...(t.names||[])],lockedSeats:[...(t.lockedSeats||[])]}))}}
function renderPlacementControls(){if(!room)return;ensureRoom52(room);let s=$('placementSelect'),d=$('deletePlacementBtn');if(!s)return;s.innerHTML='<option value="">Aktuell placering</option>'+room.placements.map(p=>`<option value="${p.id}" ${room.activePlacementId===p.id?'selected':''}>${esc(p.name)}</option>`).join('');s.value=room.activePlacementId||'';if(d)d.disabled=!room.activePlacementId}
function savePlacementAs(){if(!room)return;let suggested=`Placering ${room.placements.length+1}`,name=prompt('Namn på placeringen:',suggested);if(!name?.trim())return;let p=placementSnapshot(name.trim());room.placements.push(p);room.activePlacementId=p.id;snapshotRoom();saveRoom(false);renderPlacementControls();toast(`Placeringen ”${name.trim()}” sparades.`)}
function loadPlacement(id){if(!room)return;if(!id){room.activePlacementId='';renderPlacementControls();return}let p=room.placements.find(x=>x.id===id);if(!p)return;snapshotRoom();let map=new Map(p.tables.map(t=>[t.id,t]));room.tables.forEach(t=>{let saved=map.get(t.id);if(saved){t.names=Array.from({length:t.seats},(_,i)=>saved.names?.[i]||'');t.lockedSeats=Array.from({length:t.seats},(_,i)=>!!saved.lockedSeats?.[i])}});room.activePlacementId=id;scheduleAutosave();renderCanvas();renderPlacementControls();toast(`Placeringen ”${p.name}” öppnades.`)}
function deleteActivePlacement(){if(!room?.activePlacementId)return;let p=room.placements.find(x=>x.id===room.activePlacementId);if(!p||!confirm(`Ta bort placeringen ”${p.name}”?`))return;room.placements=room.placements.filter(x=>x.id!==p.id);room.activePlacementId='';saveRoom(false);renderPlacementControls();toast('Placeringen togs bort.')}
function toggleSeatLock(tableId,index){let t=room?.tables.find(x=>x.id===tableId);if(!t)return;ensureRoom52(room);snapshotRoom();t.lockedSeats[index]=!t.lockedSeats[index];scheduleAutosave();renderCanvas();toast(t.lockedSeats[index]?'Platsen är låst.':'Platsen är upplåst.')}
function seatMarkup(t,n,i,result,extra=''){let locked=!!t.lockedSeats?.[i],has=!!n;return`<div class="seat ${extra} ${locked?'lockedSeat':'dragName'}" draggable="${has&&!locked}" data-seat-index="${i}" data-student="${has&&!locked?encodeURIComponent(n):''}">${esc(n)||(result?'':'Tom')}<button class="seatLock" onpointerdown="event.stopPropagation()" onclick="event.stopPropagation();toggleSeatLock('${t.id}',${i})" title="${locked?'Lås upp plats':'Lås plats'}">${locked?'🔒':'🔓'}</button></div>`}
function tableHTML(t,result){ensureRoom52(room);let names=Array.from({length:t.seats},(_,i)=>t.names?.[i]||''),inside=t.type==='rect'?`<div class="rectGrid n${t.seats}">${names.map((n,i)=>seatMarkup(t,n,i,result)).join('')}</div>`:t.type==='square'?seatMarkup(t,names[0],0,result):names.map((n,i)=>{let a=-Math.PI/2+2*Math.PI*i/t.seats,x=Math.cos(a)*31,y=Math.sin(a)*34;return seatMarkup(t,n,i,result,'roundSeat').replace('class="seat ','style="--x:'+x+'px;--y:'+y+'px" class="seat ')}).join('');let base=t.type==='rect'?[180,86]:t.type==='square'?[76,76]:[132,132],sc=t.scale||1;return`<div class="obj tableObj ${t.type} ${sel?.id===t.id&&!result?'selected':''}" data-kind="table" data-id="${t.id}" style="left:${t.x}px;top:${t.y}px;width:${base[0]*sc}px;height:${base[1]*sc}px;transform:rotate(${t.rotation}deg)"><div class="shape">${inside}</div>${sel?.id===t.id&&!result&&!room.layoutLocked?`<span class="rotateStem"></span><button class="rotateHandle" data-rotate-id="${t.id}" aria-label="Rotera">↻</button>`:''}</div>`}
function renderCanvas(id='canvas',result=false){ensureRoom52(room);let c=$(id);if(!result&&room)scheduleAutosave();c.innerHTML=room.objects.map(o=>`<div class="obj labelObj ${o.type} ${sel?.id===o.id&&!result?'selected':''}" data-kind="object" data-id="${o.id}" style="left:${o.x}px;top:${o.y}px;transform:rotate(${o.rotation||0}deg) scale(${o.scale||1})">${o.type==='board'?'WHITEBOARD':o.type==='door'?'DÖRR':''}${sel?.id===o.id&&!result&&!room.layoutLocked?'<span class="rotateStem"></span><button class="rotateHandle" data-rotate-id="'+o.id+'" aria-label="Rotera">↻</button>':''}</div>`).join('')+room.tables.map(t=>tableHTML(t,result)).join('');if(!result){applyZoom(c);bindCanvasPan();bindDrag(c);bindRotateHandles(c);bindSeatClicks(c);bindNameDrag(c);renderInlinePanel()}else applyZoom(c);if($('stats'))$('stats').textContent=`${room.tables.length} bord · ${capacity(room)} platser`;updateLayoutLockUI();renderPlacementControls();inspect()}
function bindDrag(c){if(room?.layoutLocked)return;c.querySelectorAll('.obj').forEach(el=>{el.addEventListener('pointerdown',e=>{if(e.target.closest('.dragName')&&e.target.dataset.student)return;if(e.target.closest('.seatLock'))return;e.preventDefault();e.stopPropagation();sel={kind:el.dataset.kind,id:el.dataset.id};c.querySelectorAll('.obj').forEach(x=>x.classList.toggle('selected',x===el));inspect();snapshotRoom();let it=item(),startX=e.clientX,startY=e.clientY,origX=it.x,origY=it.y,scale=c.getBoundingClientRect().width/c.offsetWidth||1;el.classList.add('dragging');el.setPointerCapture?.(e.pointerId);const move=ev=>{it.x=Math.max(0,Math.min(c.offsetWidth-40,origX+(ev.clientX-startX)/scale));it.y=Math.max(0,Math.min(c.offsetHeight-30,origY+(ev.clientY-startY)/scale));el.style.left=it.x+'px';el.style.top=it.y+'px'};const up=()=>{el.classList.remove('dragging');el.removeEventListener('pointermove',move);el.removeEventListener('pointerup',up);el.removeEventListener('pointercancel',up);scheduleAutosave()};el.addEventListener('pointermove',move);el.addEventListener('pointerup',up);el.addEventListener('pointercancel',up)})})}
function bindSeatClicks(c){c.querySelectorAll('.tableObj .seat').forEach(el=>{let locked=el.classList.contains('lockedSeat');el.classList.toggle('clickable',!locked&&!!el.dataset.student);el.onclick=e=>{if(e.target.closest('.seatLock')||el.dataset.justDragged||locked)return;e.stopPropagation();let tableEl=el.closest('.tableObj'),t=room.tables.find(x=>x.id===tableEl.dataset.id),idx=+el.dataset.seatIndex;if(t?.names?.[idx]){snapshotRoom();t.names[idx]='';scheduleAutosave();renderCanvas()}}})}
function moveStudentToSeat(name,tableId,seatIndex){ensureRoom52(room);let target=room.tables.find(t=>t.id===tableId);if(!target)return;if(target.lockedSeats?.[seatIndex])return toast('Målplatsen är låst.');let source=findStudentLocation(name);if(source&&source.table.lockedSeats?.[source.index])return toast('Eleven sitter på en låst plats.');snapshotRoom();let displaced=target.names[seatIndex]||'';if(source)source.table.names[source.index]='';else removeStudentEverywhere(name);target.names[seatIndex]=name;if(displaced&&norm(displaced)!==norm(name)&&source)source.table.names[source.index]=displaced;scheduleAutosave();renderCanvas()}
function inlineRandomize(){ensureRoom52(room);let all=inlineStudents(),lockedNames=new Set(),open=[];room.tables.forEach(t=>{for(let i=0;i<t.seats;i++){if(t.lockedSeats[i]){if(t.names[i])lockedNames.add(norm(t.names[i]))}else open.push([t,i])}});let pool=shuffle(all.filter(n=>!lockedNames.has(norm(n))));if(!all.length)return toast('Välj minst en elevgrupp.');if(pool.length>open.length)return alert(`Det saknas ${pool.length-open.length} olåsta platser.`);snapshotRoom();open.forEach(([t,i],k)=>t.names[i]=pool[k]||'');room.activePlacementId='';scheduleAutosave();renderCanvas()}
function clearSeating(){ensureRoom52(room);snapshotRoom();room.tables.forEach(t=>{for(let i=0;i<t.seats;i++)if(!t.lockedSeats[i])t.names[i]=''});room.activePlacementId='';scheduleAutosave();renderCanvas()}
function bindRotateHandles(c){if(room?.layoutLocked)return;c.querySelectorAll('.rotateHandle').forEach(h=>{h.onpointerdown=e=>{e.preventDefault();e.stopPropagation();let host=h.closest('.obj'),it=item();if(!host||!it)return;snapshotRoom();h.setPointerCapture?.(e.pointerId);h.classList.add('rotating');let badge=document.createElement('div');badge.className='angleBadge';document.body.appendChild(badge);const update=ev=>{let r=host.getBoundingClientRect(),cx=r.left+r.width/2,cy=r.top+r.height/2,angle=normalizeAngle(Math.atan2(ev.clientY-cy,ev.clientX-cx)*180/Math.PI+90);it.rotation=angle;host.style.transform=`rotate(${angle}deg)${sel?.kind==='object'?' scale('+(it.scale||1)+')':''}`;badge.textContent=angle+'°';badge.style.left=ev.clientX+'px';badge.style.top=ev.clientY+'px'};const done=()=>{h.classList.remove('rotating');badge.remove();h.onpointermove=null;h.onpointerup=null;h.onpointercancel=null;scheduleAutosave();renderCanvas()};h.onpointermove=update;h.onpointerup=done;h.onpointercancel=done}})}
const _inspect52=inspect;inspect=function(){if(room?.layoutLocked&&sel){let p=$('inspect');if(p)p.innerHTML='<div class="lockNotice">🔒 Ritningen är låst. Lås upp ritningen för att ändra möbler och figurer.</div>';return}_inspect52()}

function addTable(type){if(room?.layoutLocked)return toast('Lås upp ritningen först.');snapshotRoom();let seats=type==='square'?1:type==='rect'?2:4,n=room.tables.length,col=n%3,row=Math.floor(n/3);room.tables.push({id:uid(),type,seats,x:45+col*245,y:55+row*175,rotation:0,scale:1,names:Array(seats).fill(''),lockedSeats:Array(seats).fill(false)});sel={kind:'table',id:room.tables.at(-1).id};room.activePlacementId='';renderCanvas()}
function addObject(type){if(room?.layoutLocked)return toast('Lås upp ritningen först.');snapshotRoom();let n=room.objects.length;room.objects.push({id:uid(),type,x:type==='board'?340:45+(n%4)*190,y:type==='board'?15:type==='wall'?480:430,rotation:0,scale:1});sel={kind:'object',id:room.objects.at(-1).id};renderCanvas()}


/* Gruppcentralen 5.3 */
function updateUndoButton(){let u=$('undoBtn'),r=$('redoBtn');if(u)u.disabled=!undoStack.length;if(r)r.disabled=!redoStack.length}
function snapshotRoom(){if(!room)return;undoStack.push(JSON.stringify(room));if(undoStack.length>30)undoStack.shift();redoStack=[];updateUndoButton()}
function clearUndo(){undoStack=[];redoStack=[];updateUndoButton()}
function undoLast(){if(!room||!undoStack.length)return;redoStack.push(JSON.stringify(room));room=ensureRoom52(JSON.parse(undoStack.pop()));sel=null;saveRoom(false);renderCanvas();updateUndoButton();toast('Senaste ändringen ångrades.')}
function redoLast(){if(!room||!redoStack.length)return;undoStack.push(JSON.stringify(room));room=ensureRoom52(JSON.parse(redoStack.pop()));sel=null;saveRoom(false);renderCanvas();updateUndoButton();toast('Ändringen gjordes om.')}
function setWorkMode(mode,announce=true){workMode=mode==='place'?'place':'build';let b=$('classroomBuilder'),build=$('buildModeBtn'),place=$('placeModeBtn');b?.classList.toggle('placeMode',workMode==='place');build?.classList.toggle('active',workMode==='build');place?.classList.toggle('active',workMode==='place');if(room){room.layoutLocked=workMode==='place';updateLayoutLockUI()}if(workMode==='place'){if(toolsVisible){toolsVisible=false;b?.classList.add('toolsCollapsed');$('toggleToolsBtn')?.classList.remove('active')}if(!studentsVisible){studentsVisible=true;b?.classList.remove('studentsCollapsed');$('toggleStudentsBtn')?.classList.add('active')}clearSelectedStudent();if(announce)toast('Placeringsläge: ritningen är skyddad.')}else{clearSelectedStudent();if(announce)toast('Byggläge: möbler och figurer kan redigeras.')}renderCanvas()}
function clearSelectedStudent(){selectedStudent=null,ruleDrafts=[],editingRuleIndex=-1;let banner=$('selectedStudentBanner');banner?.classList.add('hide');document.querySelectorAll('.selectedStudent').forEach(x=>x.classList.remove('selectedStudent'))}
function selectStudent(name,element=null){if(!name)return;selectedStudent=name;let banner=$('selectedStudentBanner'),label=$('selectedStudentName');if(label)label.textContent=name;banner?.classList.remove('hide');document.querySelectorAll('.selectedStudent').forEach(x=>x.classList.remove('selectedStudent'));element?.classList.add('selectedStudent')}
function renderUnassigned(){if(!$('unassigned')||!room)return;let used=assignedNames(),left=inlineStudents().filter(n=>!used.has(norm(n)));$('unassigned').innerHTML=left.length?left.map(n=>`<button class="unassignedName dragName ${selectedStudent&&norm(selectedStudent)===norm(n)?'selectedStudent':''}" draggable="true" data-student="${encodeURIComponent(n)}" title="Dra eller tryck för att välja" onclick="event.stopPropagation();selectStudent(decodeURIComponent(this.dataset.student),this)">${esc(n)}</button>`).join(''):'<span class="meta">Alla valda elever är placerade.</span>';bindNameDrag(document)}
function tapSeat(tableId,index,el){let t=room.tables.find(x=>x.id===tableId);if(!t||t.lockedSeats?.[index])return toast('Platsen är låst.');let occupant=t.names?.[index]||'';if(selectedStudent){let chosen=selectedStudent;moveStudentToSeat(chosen,tableId,index);clearSelectedStudent();return}if(occupant)selectStudent(occupant,el)}
function bindSeatClicks(c){c.querySelectorAll('.tableObj .seat').forEach(el=>{let locked=el.classList.contains('lockedSeat'),tableEl=el.closest('.tableObj'),idx=+el.dataset.seatIndex,t=room.tables.find(x=>x.id===tableEl.dataset.id),name=t?.names?.[idx]||'';el.classList.toggle('clickable',!locked&&!!name);el.classList.toggle('tapTarget',workMode==='place'&&!locked);el.classList.toggle('selectedStudent',!!selectedStudent&&norm(selectedStudent)===norm(name));el.onclick=e=>{if(e.target.closest('.seatLock')||el.dataset.justDragged||locked)return;e.stopPropagation();if(workMode==='place'||matchMedia('(max-width:700px)').matches){tapSeat(tableEl.dataset.id,idx,el);return}if(name){snapshotRoom();t.names[idx]='';scheduleAutosave();renderCanvas()}}})}
function bindDrag(c){if(room?.layoutLocked||workMode==='place')return;c.querySelectorAll('.obj').forEach(el=>{el.addEventListener('pointerdown',e=>{if(e.target.closest('.dragName')&&e.target.dataset.student)return;if(e.target.closest('.seatLock'))return;e.preventDefault();e.stopPropagation();sel={kind:el.dataset.kind,id:el.dataset.id};c.querySelectorAll('.obj').forEach(x=>x.classList.toggle('selected',x===el));inspect();snapshotRoom();let it=item(),startX=e.clientX,startY=e.clientY,origX=it.x,origY=it.y,scale=c.getBoundingClientRect().width/c.offsetWidth||1;el.classList.add('dragging');el.setPointerCapture?.(e.pointerId);const move=ev=>{it.x=Math.max(0,Math.min(c.offsetWidth-40,origX+(ev.clientX-startX)/scale));it.y=Math.max(0,Math.min(c.offsetHeight-30,origY+(ev.clientY-startY)/scale));el.style.left=it.x+'px';el.style.top=it.y+'px'};const up=()=>{el.classList.remove('dragging');el.removeEventListener('pointermove',move);el.removeEventListener('pointerup',up);el.removeEventListener('pointercancel',up);scheduleAutosave()};el.addEventListener('pointermove',move);el.addEventListener('pointerup',up);el.addEventListener('pointercancel',up)})})}
function printPlacement(){if(!room)return;let rn=$('printRoomName'),pn=$('printPlacementName'),active=room.placements?.find(p=>p.id===room.activePlacementId);if(rn)rn.textContent=room.name||'Klassrum';if(pn)pn.textContent=active?active.name:new Date().toLocaleDateString('sv-SE');window.print()}


/* Gruppcentralen 5.4: placeringsregler i Elevgrupper */
const RULE_LABELS={avoid:'ska inte sitta vid samma bord som',together:'ska sitta vid samma bord som',single:'ska ha en enskild plats',front:'ska placeras långt fram'};
function normalizeGroupRules(g){g.rules=Array.isArray(g.rules)?g.rules.filter(r=>r&&r.type&&r.a):[];return g}
function currentStudentNames(){return[...new Set(($('gStudents')?.value||'').split(/\r?\n|;|\t/).map(x=>x.trim()).filter(Boolean))]}
function ruleDescription(r){let a=esc(r.a),label=RULE_LABELS[r.type]||r.type;return r.type==='avoid'||r.type==='together'?`${a} ${label} ${esc(r.b||'')}`:`${a} ${label}`}
function renderRulesEditor(){let list=$('rulesList');if(!list)return;list.innerHTML=ruleDrafts.length?ruleDrafts.map((r,i)=>`<div class="ruleItem"><span class="ruleTag ${r.strength==='must'?'must':'prefer'}">${r.strength==='must'?'MÅSTE':'HELST'}</span><span class="ruleText">${ruleDescription(r)}</span><button type="button" onclick="removeRuleDraft(${i})">Ta bort</button></div>`).join(''):'<div class="emptyRules">Inga placeringsregler ännu.</div>'}
function refreshRuleStudentOptions(){let names=currentStudentNames(),a=$('ruleA'),b=$('ruleB');if(!a||!b)return;let av=a.value,bv=b.value,html=names.map(n=>`<option value="${esc(n)}">${esc(n)}</option>`).join('');a.innerHTML=html;b.innerHTML=html;if(names.includes(av))a.value=av;if(names.includes(bv))b.value=bv}
function addRuleDraft(){editingRuleIndex=-1;refreshRuleStudentOptions();$('ruleForm').classList.remove('hide');updateRuleFormLabels()}
function cancelRuleDraft(){$('ruleForm').classList.add('hide')}
function updateRuleFormLabels(){let pair=['avoid','together'].includes($('ruleType')?.value);$('ruleBWrap')?.classList.toggle('hide',!pair)}
function saveRuleDraft(){let type=$('ruleType').value,strength=$('ruleStrength').value,a=$('ruleA').value,b=['avoid','together'].includes(type)?$('ruleB').value:'';if(!a)return alert('Välj en elev.');if(b&&norm(a)===norm(b))return alert('Välj två olika elever.');let r={id:uid(),type,strength,a,b};ruleDrafts.push(r);renderRulesEditor();cancelRuleDraft()}
function removeRuleDraft(i){ruleDrafts.splice(i,1);renderRulesEditor()}
const _openGroup54=openGroup;openGroup=function(id=null){_openGroup54(id);let g=id?groups.find(x=>x.id===id):null;ruleDrafts=JSON.parse(JSON.stringify(normalizeGroupRules(g||{rules:[]}).rules));refreshRuleStudentOptions();renderRulesEditor();cancelRuleDraft()}
function saveGroup(){let students=currentStudentNames(),valid=new Set(students.map(norm)),rules=ruleDrafts.filter(r=>valid.has(norm(r.a))&&(!r.b||valid.has(norm(r.b))));let o={grade:$('gGrade').value.trim(),category:$('gCat').value.trim(),name:$('gName').value.trim(),students,rules};if(!o.grade||!o.category||!o.name||!o.students.length)return alert('Fyll i alla fält.');if(editId)Object.assign(groups.find(x=>x.id===editId),o);else groups.push({id:uid(),...o});save();closeGroup();renderGroups();updateHomeStatus()}
function selectedRules(){let out=[];groups.filter(g=>inlineSel.has(g.id)).forEach(g=>normalizeGroupRules(g).rules.forEach(r=>out.push({...r,groupId:g.id,groupName:g.name})));return out}
function toggleRuleDetails(){$('ruleDetails')?.classList.toggle('hide')}
function updateRuleSummary(){let rules=selectedRules(),btn=$('ruleSummaryBtn'),details=$('ruleDetails');if(!btn||!details)return;if(!rules.length){btn.classList.add('hide');details.classList.add('hide');details.innerHTML='';return}let must=rules.filter(r=>r.strength==='must').length,pref=rules.length-must;btn.classList.remove('hide');btn.textContent=`⚙ ${must} måste-regler · ${pref} önskemål`;details.innerHTML=rules.map(r=>`<div><b>${r.strength==='must'?'Måste':'Helst'}:</b> ${ruleDescription(r)}</div>`).join('')}
const _renderInlinePanel54=renderInlinePanel;renderInlinePanel=function(){_renderInlinePanel54();updateRuleSummary()}
function ruleContext(assignments){let loc=new Map();assignments.forEach(x=>{if(x.name)loc.set(norm(x.name),x)});let minY=Math.min(...room.tables.map(t=>t.y||0)),frontLimit=minY+120;return{loc,frontLimit}}
function evaluateRule(r,ctx){let a=ctx.loc.get(norm(r.a)),b=r.b?ctx.loc.get(norm(r.b)):null;if(!a)return{met:false,reason:`${r.a} saknar plats`};if(r.type==='avoid')return{met:!b||a.table.id!==b.table.id,reason:`${r.a} och ${r.b} sitter vid samma bord`};if(r.type==='together')return{met:!!b&&a.table.id===b.table.id,reason:`${r.a} och ${r.b} sitter inte vid samma bord`};if(r.type==='single')return{met:a.table.seats===1,reason:`${r.a} har inte en enskild plats`};if(r.type==='front')return{met:(a.table.y||0)<=ctx.frontLimit,reason:`${r.a} sitter inte långt fram`};return{met:true,reason:''}}
function buildAssignments(pool,open){return open.map(([table,index],i)=>({table,index,name:pool[i]||''}))}
function applyAssignments(assignments){assignments.forEach(x=>x.table.names[x.index]=x.name)}
function showRuleResult(kind,html){let el=$('ruleResult');if(!el)return;el.className=`ruleResult ${kind}`;el.innerHTML=html;el.classList.remove('hide')}
function constrainedRandomize(){ensureRoom52(room);let all=inlineStudents(),rules=selectedRules(),lockedNames=new Set(),open=[];room.tables.forEach(t=>{for(let i=0;i<t.seats;i++){if(t.lockedSeats[i]){if(t.names[i])lockedNames.add(norm(t.names[i]))}else open.push([t,i])}});let pool=all.filter(n=>!lockedNames.has(norm(n)));if(!all.length){toast('Välj minst en elevgrupp.');return false}if(pool.length>open.length){alert(`Det saknas ${pool.length-open.length} olåsta platser.`);return false}let locked=[];room.tables.forEach(t=>t.names.forEach((n,i)=>{if(t.lockedSeats[i]&&n)locked.push({table:t,index:i,name:n})}));let best=null,bestScore=-1,bestHard=null,tries=Math.max(1200,Math.min(8000,pool.length*350));for(let k=0;k<tries;k++){let candidate=shuffle(pool),assign=buildAssignments(candidate,open),ctx=ruleContext([...locked,...assign]),hardBad=[],score=0,metPref=0,totalPref=0;for(let r of rules){let ev=evaluateRule(r,ctx);if(r.strength==='must'&&!ev.met)hardBad.push(ev.reason);if(r.strength!=='must'){totalPref++;if(ev.met){score+=10;metPref++}}}if(!hardBad.length&&score>bestScore){best={assign,metPref,totalPref};bestScore=score;if(score===totalPref*10)break}else if(!bestHard||hardBad.length<bestHard.length)bestHard=hardBad}if(!best){showRuleResult('error',`Placeringen kunde inte skapas.<br>${[...new Set(bestHard||['Reglerna går inte att kombinera med de lediga platserna.'])].map(x=>'• '+esc(x)).join('<br>')}`);return false}snapshotRoom();applyAssignments(best.assign);room.activePlacementId='';scheduleAutosave();renderCanvas();let must=rules.filter(r=>r.strength==='must').length;if(!rules.length)showRuleResult('ok','Placeringen skapades utan särskilda regler.');else if(best.metPref===best.totalPref)showRuleResult('ok',`✓ Alla ${must} måste-regler följdes.<br>✓ Alla ${best.totalPref} önskemål uppfylldes.`);else showRuleResult('warn',`✓ Alla ${must} måste-regler följdes.<br>○ ${best.metPref} av ${best.totalPref} önskemål uppfylldes.`);return true}
inlineRandomize=constrainedRandomize;


/* Gruppcentralen 5.5: regler för flera elever */
function ruleArray(v){return Array.isArray(v)?v.filter(Boolean):(v?[v]:[])}
function normalizeRule55(r){r.as=ruleArray(r.as?.length?r.as:r.a);r.bs=ruleArray(r.bs?.length?r.bs:r.b);r.a=r.as[0]||'';r.b=r.bs[0]||'';return r}
function normalizeGroupRules(g){g.rules=Array.isArray(g.rules)?g.rules.filter(r=>r&&r.type).map(normalizeRule55).filter(r=>r.as.length):[];return g}
function getMultiValues(id){return[...($(id)?.selectedOptions||[])].map(o=>o.value)}
function setMultiOptions(select,names,selected=[]){if(!select)return;let chosen=new Set(ruleArray(selected).map(norm));select.innerHTML=names.map(n=>`<option value="${esc(n)}" ${chosen.has(norm(n))?'selected':''}>${esc(n)}</option>`).join('')}
function refreshRuleStudentOptions(){let names=currentStudentNames(),a=$('ruleA'),b=$('ruleB'),av=getMultiValues('ruleA'),bv=getMultiValues('ruleB');setMultiOptions(a,names,av);setMultiOptions(b,names,bv)}
function namesText(xs){return ruleArray(xs).map(esc).join(', ')}
function ruleDescription(r){normalizeRule55(r);let left=namesText(r.as),right=namesText(r.bs),label=RULE_LABELS[r.type]||r.type;if(r.type==='avoid')return`${left} ${label} ${right}`;if(r.type==='together')return`${left} ${label} ${right}`;return`${left} ${label}`}
function saveRuleDraft(){let type=$('ruleType').value,strength=$('ruleStrength').value,as=getMultiValues('ruleA'),bs=['avoid','together'].includes(type)?getMultiValues('ruleB'):[];if(!as.length)return alert('Välj minst en elev.');if(['avoid','together'].includes(type)&&!bs.length)return alert('Välj minst en elev i båda listorna.');let left=new Set(as.map(norm)),overlap=bs.filter(x=>left.has(norm(x)));if(overlap.length)return alert('Samma elev kan inte finnas på båda sidor av regeln.');ruleDrafts.push(normalizeRule55({id:uid(),type,strength,as,bs}));renderRulesEditor();cancelRuleDraft()}
function renderRulesEditor(){let list=$('rulesList');if(!list)return;list.innerHTML=ruleDrafts.length?ruleDrafts.map((r,i)=>`<div class="ruleItem"><span class="ruleTag ${r.strength==='must'?'must':'prefer'}">${r.strength==='must'?'MÅSTE':'HELST'}</span><span class="ruleText">${ruleDescription(r)}</span><button type="button" onclick="removeRuleDraft(${i})">Ta bort</button></div>`).join(''):'<div class="emptyRules">Inga placeringsregler ännu.</div>'}
function saveGroup(){let students=currentStudentNames(),valid=new Set(students.map(norm)),rules=ruleDrafts.map(normalizeRule55).filter(r=>r.as.every(x=>valid.has(norm(x)))&&r.bs.every(x=>valid.has(norm(x))));let o={grade:$('gGrade').value.trim(),category:$('gCat').value.trim(),name:$('gName').value.trim(),students,rules};if(!o.grade||!o.category||!o.name||!o.students.length)return alert('Fyll i alla fält.');if(editId)Object.assign(groups.find(x=>x.id===editId),o);else groups.push({id:uid(),...o});save();closeGroup();renderGroups();updateHomeStatus()}
function selectedRules(){let out=[];groups.filter(g=>inlineSel.has(g.id)).forEach(g=>normalizeGroupRules(g).rules.forEach(r=>out.push({...r,as:[...r.as],bs:[...r.bs],groupId:g.id,groupName:g.name})));return out}
function sameTable(a,b){return!!a&&!!b&&a.table.id===b.table.id}
function evaluateRule(r,ctx){normalizeRule55(r);let left=r.as.map(n=>({name:n,loc:ctx.loc.get(norm(n))})),right=r.bs.map(n=>({name:n,loc:ctx.loc.get(norm(n))}));let missing=[...left,...right].filter(x=>!x.loc);if(missing.length)return{met:false,reason:`${missing.map(x=>x.name).join(', ')} saknar plats`};if(r.type==='avoid'){let bad=[];for(let a of left)for(let b of right)if(sameTable(a.loc,b.loc))bad.push(`${a.name} och ${b.name}`);return{met:!bad.length,reason:`${bad.join(', ')} sitter vid samma bord`}}if(r.type==='together'){let all=[...left,...right],table=all[0]?.loc?.table?.id,met=!!table&&all.every(x=>x.loc.table.id===table);return{met,reason:`${all.map(x=>x.name).join(', ')} sitter inte vid samma bord`}}if(r.type==='single'){let bad=left.filter(x=>x.loc.table.seats!==1);return{met:!bad.length,reason:`${bad.map(x=>x.name).join(', ')} har inte enskild plats`}}if(r.type==='front'){let bad=left.filter(x=>(x.loc.table.y||0)>ctx.frontLimit);return{met:!bad.length,reason:`${bad.map(x=>x.name).join(', ')} sitter inte långt fram`}}return{met:true,reason:''}}


/* Gruppcentralen 5.6: regelhantering, förkontroll och detaljrapport */
function ensureRule56(r){normalizeRule55(r);r.id=r.id||uid();r.enabled=r.enabled!==false;return r}
function normalizeGroupRules(g){g.rules=Array.isArray(g.rules)?g.rules.filter(r=>r&&r.type).map(ensureRule56).filter(r=>r.as.length):[];return g}
function fillRuleForm(r){r=ensureRule56(JSON.parse(JSON.stringify(r)));$('ruleStrength').value=r.strength||'must';$('ruleType').value=r.type;refreshRuleStudentOptions();setMultiOptions($('ruleA'),currentStudentNames(),r.as);setMultiOptions($('ruleB'),currentStudentNames(),r.bs);updateRuleFormLabels();$('ruleForm').classList.remove('hide');$('ruleForm').classList.add('editing')}
function addRuleDraft(){editingRuleIndex=-1;refreshRuleStudentOptions();setMultiOptions($('ruleA'),currentStudentNames(),[]);setMultiOptions($('ruleB'),currentStudentNames(),[]);$('ruleStrength').value='must';$('ruleType').value='avoid';$('ruleForm').classList.remove('hide');$('ruleForm').classList.remove('editing');updateRuleFormLabels()}
function editRuleDraft(i){editingRuleIndex=i;fillRuleForm(ruleDrafts[i]);$('ruleForm').scrollIntoView({block:'nearest',behavior:'smooth'})}
function copyRuleDraft(i){let r=ensureRule56(JSON.parse(JSON.stringify(ruleDrafts[i])));r.id=uid();ruleDrafts.splice(i+1,0,r);renderRulesEditor();toast('Regeln kopierades.')}
function pauseRuleDraft(i){ruleDrafts[i].enabled=ruleDrafts[i].enabled===false;renderRulesEditor()}
function cancelRuleDraft(){editingRuleIndex=-1;$('ruleForm').classList.add('hide');$('ruleForm').classList.remove('editing')}
function saveRuleDraft(){let type=$('ruleType').value,strength=$('ruleStrength').value,as=getMultiValues('ruleA'),bs=['avoid','together'].includes(type)?getMultiValues('ruleB'):[];if(!as.length)return alert('Välj minst en elev.');if(['avoid','together'].includes(type)&&!bs.length)return alert('Välj minst en elev i båda listorna.');let left=new Set(as.map(norm));if(bs.some(x=>left.has(norm(x))))return alert('Samma elev kan inte finnas på båda sidor av regeln.');let old=editingRuleIndex>=0?ruleDrafts[editingRuleIndex]:null,r=ensureRule56({id:old?.id||uid(),type,strength,as,bs,enabled:old?.enabled!==false});if(editingRuleIndex>=0)ruleDrafts[editingRuleIndex]=r;else ruleDrafts.push(r);renderRulesEditor();cancelRuleDraft()}
function renderRulesEditor(){let list=$('rulesList');if(!list)return;list.innerHTML=ruleDrafts.length?ruleDrafts.map((r,i)=>{ensureRule56(r);return`<div class="ruleItem ${r.enabled===false?'paused':''}"><span class="ruleTag ${r.strength==='must'?'must':'prefer'}">${r.strength==='must'?'MÅSTE':'HELST'}</span><span class="ruleText">${ruleDescription(r)} ${r.enabled===false?'<span class="rulePause">PAUSAD</span>':''}</span><span class="ruleItemActions"><button type="button" onclick="editRuleDraft(${i})">Redigera</button><button type="button" onclick="copyRuleDraft(${i})">Kopiera</button><button type="button" onclick="pauseRuleDraft(${i})">${r.enabled===false?'Aktivera':'Pausa'}</button><button class="removeRule" type="button" onclick="removeRuleDraft(${i})">Ta bort</button></span></div>`}).join(''):'<div class="emptyRules">Inga placeringsregler ännu.</div>'}
function ensureRoomRules(){if(!room)return;room.ruleOverrides=room.ruleOverrides&&typeof room.ruleOverrides==='object'?room.ruleOverrides:{}}
function allSelectedRules(){let out=[];groups.filter(g=>inlineSel.has(g.id)).forEach(g=>normalizeGroupRules(g).rules.forEach(r=>out.push({...r,as:[...r.as],bs:[...r.bs],groupId:g.id,groupName:g.name})));return out}
function isRuleActive(r){ensureRoomRules();return r.enabled!==false&&room.ruleOverrides[r.id]!==false}
function selectedRules(){return allSelectedRules().filter(isRuleActive)}
function toggleClassRule(id,on){ensureRoomRules();room.ruleOverrides[id]=!!on;scheduleAutosave();updateRuleSummary()}
function setAllClassRules(on){ensureRoomRules();allSelectedRules().forEach(r=>room.ruleOverrides[r.id]=!!on);scheduleAutosave();updateRuleSummary()}
function rulePrecheck(rules=selectedRules()){let problems=[],warnings=[],maxCap=Math.max(0,...room.tables.map(t=>t.seats)),singleSeats=room.tables.filter(t=>t.seats===1).length,frontTables=room.tables.length?room.tables.filter(t=>(t.y||0)<=Math.min(...room.tables.map(x=>x.y||0))+120):[],frontCap=frontTables.reduce((n,t)=>n+t.seats,0);for(let r of rules){ensureRule56(r);let total=new Set([...r.as,...r.bs].map(norm)).size;if(r.type==='together'&&total>maxCap)problems.push(`${ruleDescription(r)}: största bordet har bara ${maxCap} platser.`);if(r.type==='single'&&r.as.length>singleSeats)problems.push(`${ruleDescription(r)}: det finns bara ${singleSeats} enskilda platser.`);if(r.type==='front'&&r.as.length>frontCap)problems.push(`${ruleDescription(r)}: endast ${frontCap} platser räknas som långt fram.`)}let must=rules.filter(r=>r.strength==='must');for(let i=0;i<must.length;i++)for(let k=i+1;k<must.length;k++){let a=must[i],b=must[k],aSet=new Set([...a.as,...a.bs].map(norm)),bSet=new Set([...b.as,...b.bs].map(norm)),shared=[...aSet].filter(x=>bSet.has(x));if(shared.length&&((a.type==='avoid'&&b.type==='together')||(a.type==='together'&&b.type==='avoid'))){let everyone=new Set([...aSet,...bSet]);if(everyone.size<=Math.max(aSet.size,bSet.size)+1)warnings.push(`Regler om tillsammans och åtskilda kan krocka för ${shared.length} elev/elever.`)}}return{problems:[...new Set(problems)],warnings:[...new Set(warnings)]}}
function renderPrecheck(rules){let c=rulePrecheck(rules);if(c.problems.length)return`<div class="precheck error">✕ ${c.problems.length} problem före slumpning<br>${c.problems.map(x=>'• '+x).join('<br>')}</div>`;if(c.warnings.length)return`<div class="precheck warn">⚠ Kontrollera reglerna<br>${c.warnings.map(x=>'• '+x).join('<br>')}</div>`;return`<div class="precheck ok">✓ Regelkontroll klar. ${rules.length} aktiva regler kan användas.</div>`}
function updateRuleSummary(){let all=allSelectedRules(),active=all.filter(isRuleActive),btn=$('ruleSummaryBtn'),details=$('ruleDetails');if(!btn||!details)return;if(!all.length){btn.classList.add('hide');details.classList.add('hide');details.innerHTML='';return}let must=active.filter(r=>r.strength==='must').length,pref=active.length-must;btn.classList.remove('hide');btn.textContent=`⚙ ${must} måste-regler · ${pref} önskemål · ${all.length-active.length} avstängda`;details.innerHTML=`<div class="ruleCheckHeader"><b>Regler för denna placering</b><span><button onclick="setAllClassRules(true)">Alla på</button> <button onclick="setAllClassRules(false)">Alla av</button></span></div>`+all.map(r=>`<label class="classRuleRow ${isRuleActive(r)?'':'off'}"><input type="checkbox" ${isRuleActive(r)?'checked':''} onchange="toggleClassRule('${r.id}',this.checked)"><span><b>${r.strength==='must'?'Måste':'Helst'}</b>: ${ruleDescription(r)}${r.enabled===false?'<small>Pausad i elevgruppen</small>':''}</span></label>`).join('')+renderPrecheck(active)}
function detailedReport(rules,ctx,paused=[]){let lines=rules.map(r=>{let ev=evaluateRule(r,ctx),cls=ev.met?'met':r.strength==='must'?'failed':'unmet',mark=ev.met?'✓':r.strength==='must'?'✕':'○';return`<div class="reportRule ${cls}">${mark} <b>${r.strength==='must'?'Måste':'Helst'}:</b> ${ruleDescription(r)}${ev.met?'':`<br><small>${esc(ev.reason)}</small>`}</div>`});paused.forEach(r=>lines.push(`<div class="reportRule paused">− Avstängd: ${ruleDescription(r)}</div>`));return`<div class="detailedRuleReport">${lines.join('')}</div>`}
function constrainedRandomize(){ensureRoom52(room);ensureRoomRules();let allStudents=inlineStudents(),allRules=allSelectedRules(),rules=allRules.filter(isRuleActive),paused=allRules.filter(r=>!isRuleActive(r)),pre=rulePrecheck(rules);if(pre.problems.length){showRuleResult('error',`Placeringen kunde inte skapas.<br>${pre.problems.map(x=>'• '+x).join('<br>')}`);return false}let lockedNames=new Set(),open=[];room.tables.forEach(t=>{for(let i=0;i<t.seats;i++){if(t.lockedSeats[i]){if(t.names[i])lockedNames.add(norm(t.names[i]))}else open.push([t,i])}});let pool=allStudents.filter(n=>!lockedNames.has(norm(n)));if(!allStudents.length){toast('Välj minst en elevgrupp.');return false}if(pool.length>open.length){alert(`Det saknas ${pool.length-open.length} olåsta platser.`);return false}let locked=[];room.tables.forEach(t=>t.names.forEach((n,i)=>{if(t.lockedSeats[i]&&n)locked.push({table:t,index:i,name:n})}));let best=null,bestScore=-1,bestHard=null,tries=Math.max(1600,Math.min(12000,pool.length*500));for(let k=0;k<tries;k++){let assign=buildAssignments(shuffle(pool),open),ctx=ruleContext([...locked,...assign]),hardBad=[],score=0;for(let r of rules){let ev=evaluateRule(r,ctx);if(r.strength==='must'&&!ev.met)hardBad.push(ev.reason);else if(r.strength!=='must'&&ev.met)score+=10}if(!hardBad.length&&score>bestScore){best={assign,ctx};bestScore=score;if(score===rules.filter(r=>r.strength!=='must').length*10)break}else if(!bestHard||hardBad.length<bestHard.length)bestHard=hardBad}if(!best){showRuleResult('error',`Placeringen kunde inte skapas.<br>${[...new Set(bestHard||['Reglerna går inte att kombinera med de lediga platserna.'])].map(x=>'• '+esc(x)).join('<br>')}`);return false}snapshotRoom();applyAssignments(best.assign);room.activePlacementId='';scheduleAutosave();renderCanvas();let finalAssignments=[];room.tables.forEach(t=>t.names.forEach((n,i)=>{if(n)finalAssignments.push({table:t,index:i,name:n})}));let ctx=ruleContext(finalAssignments),hardOk=rules.filter(r=>r.strength==='must').every(r=>evaluateRule(r,ctx).met),pref=rules.filter(r=>r.strength!=='must'),prefMet=pref.filter(r=>evaluateRule(r,ctx).met).length,kind=hardOk&&(prefMet===pref.length)?'ok':'warn';showRuleResult(kind,`<b>Placeringen är klar</b><br>${hardOk?'✓ Alla måste-regler följdes.':'✕ En måste-regel bröts.'}<br>${prefMet===pref.length?'✓':'○'} ${prefMet} av ${pref.length} önskemål uppfylldes.${detailedReport(rules,ctx,paused)}`);return true}
inlineRandomize=constrainedRandomize;


/* Gruppcentralen 5.7: nya figurer och färgval */
const FIGURE_DEFAULT_COLORS={rect:'#e8b562',square:'#e8b562',round:'#e8b562',half:'#e8b562',board:'#eef2f7',door:'#dfe5ee',wall:'#8895a7',bookshelf:'#a97845',armchair:'#6586a8',rug:'#d7c5a3'};
const OBJECT_LABELS={board:'WHITEBOARD',door:'DÖRR',wall:'',bookshelf:'BOKHYLLA',armchair:'FÅTÖLJ',rug:''};
function figureColor(x){return x.color||FIGURE_DEFAULT_COLORS[x.type]||'#e8b562'}
function ensureColors57(){if(!room)return;(room.tables||[]).forEach(t=>t.color=t.color||figureColor(t));(room.objects||[]).forEach(o=>o.color=o.color||figureColor(o))}
const _ensureRoom57=ensureRoom52;ensureRoom52=function(r){r=_ensureRoom57(r);if(r){(r.tables||[]).forEach(t=>t.color=t.color||figureColor(t));(r.objects||[]).forEach(o=>o.color=o.color||figureColor(o))}return r}
const _tableHTML57=tableHTML;
tableHTML=function(t,result){t.color=t.color||figureColor(t);if(t.type!=='half'){let html=_tableHTML57(t,result);return html.replace('<div class="shape">',`<div class="shape" style="--figure-color:${t.color}">`).replace('class="obj tableObj',`style="--figure-color:${t.color};`+(html.includes('style="left:')?'':'')+`" class="obj tableObj`)}let names=Array.from({length:t.seats},(_,i)=>t.names?.[i]||''),inside=names.map((n,i)=>{let a=Math.PI-(Math.PI*i/Math.max(1,t.seats-1)),x=Math.cos(a)*62,y=-Math.sin(a)*35+18;return seatMarkup(t,n,i,result,'halfSeat').replace('class="seat ',`style="--x:${x}px;--y:${y}px" class="seat `)}).join(''),sc=t.scale||1;return`<div class="obj tableObj half ${sel?.id===t.id&&!result?'selected':''}" data-kind="table" data-id="${t.id}" style="--figure-color:${t.color};left:${t.x}px;top:${t.y}px;width:${190*sc}px;height:${105*sc}px;transform:rotate(${t.rotation||0}deg)"><div class="shape halfSeats" style="--figure-color:${t.color}">${inside}</div>${sel?.id===t.id&&!result&&!room.layoutLocked?`<span class="rotateStem"></span><button class="rotateHandle" data-rotate-id="${t.id}" aria-label="Rotera">↻</button>`:''}</div>`}
function addTable(type){if(room?.layoutLocked)return toast('Lås upp ritningen först.');snapshotRoom();let seats=type==='square'?1:type==='round'?4:type==='half'?3:2,n=room.tables.length,col=n%3,row=Math.floor(n/3);room.tables.push({id:uid(),type,seats,x:45+col*245,y:55+row*175,rotation:0,scale:1,color:FIGURE_DEFAULT_COLORS[type],names:Array(seats).fill(''),lockedSeats:Array(seats).fill(false)});sel={kind:'table',id:room.tables.at(-1).id};room.activePlacementId='';renderCanvas()}
function addObject(type){if(room?.layoutLocked)return toast('Lås upp ritningen först.');snapshotRoom();let n=room.objects.length,pos={bookshelf:[90,360],armchair:[320,360],rug:[330,190]},xy=pos[type]||[type==='board'?340:45+(n%4)*190,type==='board'?15:type==='wall'?480:430];room.objects.push({id:uid(),type,x:xy[0],y:xy[1],rotation:0,scale:1,color:FIGURE_DEFAULT_COLORS[type]});sel={kind:'object',id:room.objects.at(-1).id};renderCanvas()}
function objectMarkup57(o,result){let color=o.color||figureColor(o),label=OBJECT_LABELS[o.type]??'',rug=o.type==='rug',selected=sel?.id===o.id&&!result;return`<div class="obj labelObj ${o.type} ${selected?'selected':''}" data-kind="object" data-id="${o.id}" style="--figure-color:${color};left:${o.x}px;top:${o.y}px;transform:rotate(${o.rotation||0}deg) scale(${o.scale||1});z-index:${rug?0:3}">${label}${selected&&!room.layoutLocked?'<span class="rotateStem"></span><button class="rotateHandle" data-rotate-id="'+o.id+'" aria-label="Rotera">↻</button>':''}</div>`}
function renderCanvas(id='canvas',result=false){ensureRoom52(room);ensureColors57();let c=$(id);if(!result&&room)scheduleAutosave();let objects=[...room.objects].sort((a,b)=>(a.type==='rug'?-1:0)-(b.type==='rug'?-1:0));c.innerHTML=objects.map(o=>objectMarkup57(o,result)).join('')+room.tables.map(t=>tableHTML(t,result)).join('');if(!result){applyZoom(c);bindCanvasPan();bindDrag(c);bindRotateHandles(c);bindSeatClicks(c);bindNameDrag(c);renderInlinePanel()}else applyZoom(c);if($('stats'))$('stats').textContent=`${room.tables.length} bord · ${capacity(room)} platser`;updateLayoutLockUI();renderPlacementControls();inspect()}
function setFigureColor(color){let x=item();if(!x)return;snapshotRoom();x.color=color;scheduleAutosave();renderCanvas()}
function appendColorInspector(){let p=$('inspect'),x=item();if(!p||!x||p.querySelector('.figureColorControl'))return;let colors=['#e8b562','#a97845','#6586a8','#d7c5a3','#74a57f','#d97a7a','#8d75b8','#e9edf3','#ffffff','#5d6572'],wrap=document.createElement('div');wrap.className='figureColorControl';wrap.innerHTML=`<label>Färg</label><div class="figureColorRow"><input type="color" value="${figureColor(x)}" onchange="setFigureColor(this.value)"><b>${figureColor(x).toUpperCase()}</b></div><div class="colorSwatches">${colors.map(c=>`<button style="background:${c}" title="${c}" onclick="setFigureColor('${c}')"></button>`).join('')}</div>`;p.appendChild(wrap)}
const _inspect57=inspect;inspect=function(){_inspect57();appendColorInspector()}
const _shape57=shape;shape=function(v){if(v==='half'){if(room?.layoutLocked)return toast('Lås upp ritningen först.');snapshotRoom();let x=item();x.type='half';x.seats=Math.max(2,Math.min(6,x.seats||3));x.names=Array.from({length:x.seats},(_,i)=>x.names?.[i]||'');x.lockedSeats=Array.from({length:x.seats},(_,i)=>!!x.lockedSeats?.[i]);x.color=x.color||FIGURE_DEFAULT_COLORS.half;renderCanvas();return}_shape57(v)}


/* Gruppcentralen 5.7.1 */
function removeItem(){if(!room||!sel)return toast('Välj först en figur.');if(room.layoutLocked||workMode==='place')return toast('Byt till Bygg klassrum för att ta bort figuren.');let target=item();if(!target)return toast('Figuren kunde inte hittas.');snapshotRoom();if(sel.kind==='table')room.tables=room.tables.filter(x=>x.id!==sel.id);else room.objects=room.objects.filter(x=>x.id!==sel.id);sel=null;room.activePlacementId='';scheduleAutosave();renderCanvas();toast('Figuren togs bort.')}
function bindDrag(c){if(!c||room?.layoutLocked||workMode==='place')return;c.querySelectorAll('.obj').forEach(el=>{el.onpointerdown=e=>{if(e.button!==undefined&&e.button!==0)return;if(e.target.closest('button,input,select,.seatLock,.dragName'))return;e.preventDefault();e.stopPropagation();let kind=el.dataset.kind,id=el.dataset.id;sel={kind,id};let it=item();if(!it)return;c.querySelectorAll('.obj').forEach(x=>x.classList.toggle('selected',x===el));inspect();let rect=c.getBoundingClientRect(),sx=c.offsetWidth?rect.width/c.offsetWidth:1,sy=c.offsetHeight?rect.height/c.offsetHeight:1;if(!Number.isFinite(sx)||sx<=0)sx=1;if(!Number.isFinite(sy)||sy<=0)sy=1;let startX=e.clientX,startY=e.clientY,origX=Number(it.x)||0,origY=Number(it.y)||0,lastX=origX,lastY=origY,raf=0,moved=false,snapshotted=false;el.classList.add('dragging');c.classList.add('dragActive');try{el.setPointerCapture(e.pointerId)}catch(_){}const paint=()=>{raf=0;el.style.left=lastX+'px';el.style.top=lastY+'px'};const move=ev=>{if(ev.pointerId!==e.pointerId)return;ev.preventDefault();let dx=(ev.clientX-startX)/sx,dy=(ev.clientY-startY)/sy;if(!moved&&Math.hypot(dx,dy)<3)return;if(!snapshotted){snapshotRoom();snapshotted=true}moved=true;let w=Math.max(40,el.offsetWidth||40),h=Math.max(30,el.offsetHeight||30);lastX=Math.max(0,Math.min(c.offsetWidth-w,origX+dx));lastY=Math.max(0,Math.min(c.offsetHeight-h,origY+dy));it.x=Math.round(lastX*10)/10;it.y=Math.round(lastY*10)/10;if(!raf)raf=requestAnimationFrame(paint)};const end=ev=>{if(ev&&ev.pointerId!==e.pointerId)return;if(raf){cancelAnimationFrame(raf);paint()}el.classList.remove('dragging');c.classList.remove('dragActive');el.removeEventListener('pointermove',move);el.removeEventListener('pointerup',end);el.removeEventListener('pointercancel',end);try{el.releasePointerCapture(e.pointerId)}catch(_){}if(moved){scheduleAutosave()}else{renderCanvas()}};el.addEventListener('pointermove',move,{passive:false});el.addEventListener('pointerup',end);el.addEventListener('pointercancel',end)}})}
const _setWorkMode571=setWorkMode;setWorkMode=function(mode,announce=true){_setWorkMode571(mode,announce);let b=$('classroomBuilder');if(mode==='place'){sel=null;let inspectPanel=$('inspect');if(inspectPanel)inspectPanel.innerHTML='Välj en figur.';requestAnimationFrame(()=>{let panel=$('studentPanel');if(panel)panel.scrollTop=0;let seat=$('inlineSeat');if(seat)seat.scrollTop=0})}b?.classList.toggle('studentFirst',mode==='place')}
function ensureDeleteButton571(){let p=$('inspect');if(!p||!sel||workMode==='place'||p.querySelector('.removeSelectedBtn'))return;let btn=document.createElement('button');btn.type='button';btn.className='danger removeSelectedBtn';btn.textContent='Ta bort figur';btn.onclick=e=>{e.preventDefault();e.stopPropagation();removeItem()};p.appendChild(btn)}
const _appendColorInspector571=appendColorInspector;appendColorInspector=function(){_appendColorInspector571();ensureDeleteButton571()}
document.addEventListener('keydown',e=>{if((e.key==='Delete'||e.key==='Backspace')&&sel&&workMode==='build'&&!['INPUT','TEXTAREA','SELECT'].includes(document.activeElement?.tagName)){e.preventDefault();removeItem()}})


/* Gruppcentralen 5.7.2 */
function arrangeStudentPanel572(){let box=$('inlineSeat'),un=$('unassigned');if(!box||!un)return;let block=$('unassignedBlock');if(!block){block=document.createElement('section');block.id='unassignedBlock';let h=[...box.querySelectorAll('h4')].find(x=>x.textContent.includes('Ej placerade'));let note=un.nextElementSibling&&un.nextElementSibling.matches('p.meta')?un.nextElementSibling:null;if(h)box.insertBefore(block,h);else box.prepend(block);if(h)block.appendChild(h);block.appendChild(un);if(note)block.appendChild(note)}if(workMode==='place'){let summary=$('selectedGroupSummary');if(summary)summary.after(block);box.scrollTop=0}}
function addSelectedDelete572(){document.querySelectorAll('.selectedDeleteButton').forEach(x=>x.remove());if(workMode!=='build'||!sel||room?.layoutLocked)return;let el=document.querySelector(`#canvas .obj[data-kind="${sel.kind}"][data-id="${sel.id}"]`);if(!el)return;let btn=document.createElement('button');btn.type='button';btn.className='selectedDeleteButton';btn.title='Ta bort figur';btn.setAttribute('aria-label','Ta bort markerad figur');btn.textContent='×';btn.onpointerdown=e=>{e.preventDefault();e.stopPropagation()};btn.onclick=e=>{e.preventDefault();e.stopPropagation();removeItem()};el.appendChild(btn)}
const _renderCanvas572=renderCanvas;renderCanvas=function(id='canvas',result=false){_renderCanvas572(id,result);if(!result&&id==='canvas'){arrangeStudentPanel572();addSelectedDelete572()}}
const _setWorkMode572=setWorkMode;setWorkMode=function(mode,announce=true){_setWorkMode572(mode,announce);arrangeStudentPanel572();if(mode==='build'){room.layoutLocked=false;updateLayoutLockUI();requestAnimationFrame(addSelectedDelete572)}else{document.querySelectorAll('.selectedDeleteButton').forEach(x=>x.remove())}}
function removeItem(){if(!room||!sel)return toast('Välj först en figur.');if(workMode!=='build')return toast('Tryck på Bygg klassrum för att ta bort figurer.');let target=item();if(!target)return toast('Figuren kunde inte hittas.');snapshotRoom();let before=(room.tables?.length||0)+(room.objects?.length||0);if(sel.kind==='table')room.tables=room.tables.filter(x=>x.id!==sel.id);else room.objects=room.objects.filter(x=>x.id!==sel.id);let after=(room.tables?.length||0)+(room.objects?.length||0);if(after===before)return toast('Figuren kunde inte tas bort.');sel=null;room.activePlacementId='';scheduleAutosave();renderCanvas();toast('Figuren togs bort.')}
requestAnimationFrame(arrangeStudentPanel572)


/* Gruppcentralen 5.7.3: flytta elevnamnen fysiskt högst upp */
function forceStudentsFirst573(){
  let panel=$('studentPanel'),box=$('inlineSeat'),un=$('unassigned');
  if(!panel||!box||!un)return;
  if(workMode!=='place')return;
  let inspect=$('inspect');
  if(inspect){inspect.style.display='none';inspect.setAttribute('aria-hidden','true')}
  let top=$('studentTop572');
  if(!top){
    top=document.createElement('section');top.id='studentTop572';
    let title=document.createElement('div');title.className='studentTopTitle';
    title.innerHTML='<h3>Elever att placera</h3><span class="meta" id="studentCount573"></span>';
    top.appendChild(title);
  }
  let block=$('unassignedBlock');
  if(!block){
    block=document.createElement('section');block.id='unassignedBlock';
    let h=[...box.querySelectorAll('h4')].find(x=>x.textContent.includes('Ej placerade'));
    if(h)block.appendChild(h);else block.insertAdjacentHTML('afterbegin','<h4>Ej placerade elever</h4>');
    block.appendChild(un);
  }
  if(!top.contains(block))top.appendChild(block);
  let header=box.querySelector('.fullscreenPanelHead');
  if(header)header.replaceWith(top);else box.prepend(top);
  let count=$('studentCount573'),n=un.querySelectorAll('.unassignedName').length;
  if(count)count.textContent=n?`${n} kvar`:'Alla placerade';
  box.scrollTop=0;panel.scrollTop=0;
}
const _renderInlinePanel573=renderInlinePanel;
renderInlinePanel=function(){_renderInlinePanel573();forceStudentsFirst573()}
const _renderUnassigned573=renderUnassigned;
renderUnassigned=function(){_renderUnassigned573();forceStudentsFirst573()}
const _setWorkMode573=setWorkMode;
setWorkMode=function(mode,announce=true){_setWorkMode573(mode,announce);if(mode==='place'){requestAnimationFrame(forceStudentsFirst573)}else{let inspect=$('inspect');if(inspect){inspect.style.display='';inspect.removeAttribute('aria-hidden')}}}
document.addEventListener('click',e=>{if(e.target.closest('#confirmGroupsBtn,.chosenGroupsCompact button,#placeModeBtn'))requestAnimationFrame(forceStudentsFirst573)})
requestAnimationFrame(()=>{if(workMode==='place')forceStudentsFirst573()})


/* Gruppcentralen 5.7.4: bevara bordens koordinater vid omritning */
const _tableHTMLBefore574=tableHTML;
tableHTML=function(t,result){
  t.color=t.color||figureColor(t);
  if(t.type==='half')return _tableHTMLBefore574(t,result);
  let html=_tableHTML57(t,result);
  html=html.replace('<div class="shape">',`<div class="shape" style="--figure-color:${t.color}">`);
  html=html.replace(/(<div class="obj tableObj[^"]*"[^>]*style=")([^"]*)(")/,(_,start,style,end)=>{
    let cleaned=style.replace(/--figure-color\s*:[^;]+;?/g,'');
    return`${start}--figure-color:${t.color};${cleaned}${end}`;
  });
  return html;
}


/* Gruppcentralen 5.7.5 */
const _tableHTMLBefore575=tableHTML;
tableHTML=function(t,result){
  if(t.type!=='round')return _tableHTMLBefore575(t,result);
  t.color=t.color||figureColor(t);
  let names=Array.from({length:t.seats},(_,i)=>t.names?.[i]||''),sc=t.scale||1;
  let inside=names.map((n,i)=>{
    let angle=-Math.PI/2+(2*Math.PI*i/t.seats);
    let radius=t.seats>=6?37:t.seats>=4?35:31;
    let left=50+Math.cos(angle)*radius,top=50+Math.sin(angle)*radius;
    let content=esc(n)||(result?'':'Tom');
    return `<div class="seat roundSeat dragName" draggable="${!!n}" data-student="${n?encodeURIComponent(n):''}" style="--seat-left:${left.toFixed(2)}%;--seat-top:${top.toFixed(2)}%">${content}</div>`
  }).join('');
  return `<div class="obj tableObj round ${sel?.id===t.id&&!result?'selected':''}" data-kind="table" data-id="${t.id}" style="--figure-color:${t.color};left:${t.x}px;top:${t.y}px;width:${132*sc}px;height:${132*sc}px;transform:rotate(${t.rotation||0}deg)"><div class="shape" style="--figure-color:${t.color}">${inside}</div>${sel?.id===t.id&&!result&&!room.layoutLocked?`<span class="rotateStem"></span><button class="rotateHandle" data-rotate-id="${t.id}" aria-label="Rotera">↻</button>`:''}</div>`
}
function forceStudentsFirst575(){
  let panel=$('studentPanel'),box=$('inlineSeat'),un=$('unassigned');if(!panel||!box||!un)return;
  panel.prepend(box);
  let top=$('studentTop575');if(!top){top=document.createElement('section');top.id='studentTop575'}
  let block=$('unassignedBlock');if(!block){block=document.createElement('section');block.id='unassignedBlock';let h=[...box.querySelectorAll('h4')].find(x=>x.textContent.includes('Ej placerade'));if(h)block.appendChild(h);else block.innerHTML='<h4>Ej placerade elever</h4>';block.appendChild(un);let note=un.nextElementSibling&&un.nextElementSibling.matches('p.meta')?un.nextElementSibling:null;if(note)block.appendChild(note)}
  if(!top.contains(block))top.appendChild(block);
  box.prepend(top);
  box.scrollTop=0;panel.scrollTop=0;
}
const _renderInlinePanel575=renderInlinePanel;renderInlinePanel=function(){_renderInlinePanel575();forceStudentsFirst575()}
const _renderUnassigned575=renderUnassigned;renderUnassigned=function(){_renderUnassigned575();forceStudentsFirst575()}
const _renderCanvas575=renderCanvas;renderCanvas=function(id='canvas',result=false){_renderCanvas575(id,result);if(!result&&id==='canvas')forceStudentsFirst575()}
requestAnimationFrame(forceStudentsFirst575)


/* Gruppcentralen 5.7.6 */
function block576(id,title){let el=$(id);if(el)return el;el=document.createElement('section');el.id=id;el.className='panelBlock576';el.innerHTML=`<button type="button" class="panelBlockHeader576" aria-expanded="true"><span>${title}</span><span>⌄</span></button><div class="panelBlockBody576"></div>`;el.querySelector('.panelBlockHeader576').onclick=()=>toggleBlock576(id);return el}
function toggleBlock576(id){let el=$(id);if(!el)return;el.classList.toggle('collapsed');let open=!el.classList.contains('collapsed');el.querySelector('.panelBlockHeader576')?.setAttribute('aria-expanded',String(open));try{localStorage.setItem('gc-block-'+id,open?'1':'0')}catch(_){}}
function restoreBlock576(el){try{if(localStorage.getItem('gc-block-'+el.id)==='0'){el.classList.add('collapsed');el.querySelector('.panelBlockHeader576')?.setAttribute('aria-expanded','false')}}catch(_){}}
function arrangePanelBlocks576(){
 let panel=$('studentPanel'),inline=$('inlineSeat'),un=$('unassigned'),inspect=$('inspect');if(!panel||!inline||!un)return;
 let students=block576('studentsCard576','Ej placerade elever'),groupsCard=block576('groupCard576','Välj elevgrupp'),placement=block576('placementCard576','Placering och regler'),inspectCard=block576('inspectCard576','Inställningar för bord och figurer');
 [students,groupsCard,placement,inspectCard].forEach(x=>{if(!x.parentElement||x.parentElement!==panel){panel.appendChild(x);restoreBlock576(x)}});
 let sb=students.querySelector('.panelBlockBody576');let oldBlock=$('unassignedBlock');let oldH=oldBlock?.querySelector('h4');if(oldH)oldH.remove();sb.appendChild(un);let note=oldBlock?.querySelector('p.meta');if(note)sb.appendChild(note);oldBlock?.remove();
 let gb=groupsCard.querySelector('.panelBlockBody576');['selectedGroupSummary','selectedStudentBanner','groupPickerArea','chosenGroupsCompact'].forEach(id=>{let x=$(id);if(x)gb.appendChild(x)});
 let pb=placement.querySelector('.panelBlockBody576');let buttons=inline.querySelector(':scope > .buttons');if(buttons)pb.appendChild(buttons);['ruleSummaryBtn','ruleDetails','ruleResult'].forEach(id=>{let x=$(id);if(x)pb.appendChild(x)});
 let intro=[...inline.children].filter(x=>x.matches('.fullscreenPanelHead,p.meta'));intro.forEach(x=>x.remove());
 if(inspect)inspectCard.querySelector('.panelBlockBody576').appendChild(inspect);
 panel.scrollTop=0;
}
const _renderInlinePanel576=renderInlinePanel;renderInlinePanel=function(){_renderInlinePanel576();arrangePanelBlocks576();bindStudentDrag576()}
const _renderUnassigned576=renderUnassigned;renderUnassigned=function(){_renderUnassigned576();arrangePanelBlocks576();bindStudentDrag576()}
const _renderCanvas576=renderCanvas;renderCanvas=function(id='canvas',result=false){_renderCanvas576(id,result);if(!result&&id==='canvas'){arrangePanelBlocks576();bindStudentDrag576()}}
function moveDroppedStudent576(name,seat){if(!name||!seat||seat.classList.contains('lockedSeat'))return false;let table=seat.closest('.tableObj');if(!table)return false;let idx=[...table.querySelectorAll('.seat')].indexOf(seat);if(idx<0)return false;moveStudentToSeat(name,table.dataset.id,idx);clearSelectedStudent();return true}
function bindStudentDrag576(){
 document.querySelectorAll('.unassignedName[data-student],.tableObj .seat[data-student]').forEach(el=>{
  el.setAttribute('draggable','true');
  el.ondragstart=e=>{let name=decodeURIComponent(el.dataset.student||'');if(!name){e.preventDefault();return}dragStudent=name;e.dataTransfer.effectAllowed='move';e.dataTransfer.setData('text/plain',name);document.body.classList.add('studentDragActive');setTimeout(()=>el.classList.add('draggingName'),0)};
  el.ondragend=()=>{dragStudent=null;document.body.classList.remove('studentDragActive');document.querySelectorAll('.dragDropReady').forEach(x=>x.classList.remove('dragDropReady'));el.classList.remove('draggingName')};
 });
 document.querySelectorAll('#canvas .tableObj .seat').forEach(seat=>{
  seat.ondragover=e=>{if(seat.classList.contains('lockedSeat'))return;e.preventDefault();e.dataTransfer.dropEffect='move';seat.classList.add('dragDropReady')};
  seat.ondragleave=()=>seat.classList.remove('dragDropReady');
  seat.ondrop=e=>{e.preventDefault();e.stopPropagation();seat.classList.remove('dragDropReady');let name=e.dataTransfer.getData('text/plain')||dragStudent;moveDroppedStudent576(name,seat)};
 });
}
document.addEventListener('dragover',e=>{let seat=e.target.closest?.('#canvas .tableObj .seat');if(seat&&!seat.classList.contains('lockedSeat'))e.preventDefault()});
document.addEventListener('drop',e=>{let seat=e.target.closest?.('#canvas .tableObj .seat');if(!seat)return;e.preventDefault();let name=e.dataTransfer?.getData('text/plain')||dragStudent;moveDroppedStudent576(name,seat)});
requestAnimationFrame(()=>{arrangePanelBlocks576();bindStudentDrag576()})


/* Gruppcentralen 5.7.6.1: slutlig panelstabilisering */
function finalizePanelBlocks5761(){
 let panel=$('studentPanel'),un=$('unassigned'),inspect=$('inspect');if(!panel||!un)return;
 let students=$('studentsCard576'),groupsCard=$('groupCard576'),placement=$('placementCard576'),inspectCard=$('inspectCard576');
 if(!students||!groupsCard||!placement||!inspectCard){arrangePanelBlocks576();students=$('studentsCard576');groupsCard=$('groupCard576');placement=$('placementCard576');inspectCard=$('inspectCard576')}
 let sb=students.querySelector('.panelBlockBody576');sb.prepend(un);
 ['studentTop572','studentTop575','unassignedBlock'].forEach(id=>{let x=$(id);if(x){[...x.querySelectorAll('p.meta')].forEach(n=>sb.appendChild(n));x.remove()}});
 let gb=groupsCard.querySelector('.panelBlockBody576');['selectedGroupSummary','selectedStudentBanner','groupPickerArea','chosenGroupsCompact'].forEach(id=>{let x=$(id);if(x)gb.appendChild(x)});
 let pb=placement.querySelector('.panelBlockBody576');let buttons=document.querySelector('#inlineSeat > .buttons');if(buttons)pb.prepend(buttons);['ruleSummaryBtn','ruleDetails','ruleResult'].forEach(id=>{let x=$(id);if(x)pb.appendChild(x)});
 if(inspect)inspectCard.querySelector('.panelBlockBody576').appendChild(inspect);
 document.querySelectorAll('#inlineSeat>.fullscreenPanelHead,#inlineSeat>p.meta').forEach(x=>x.remove());
 [students,groupsCard,placement,inspectCard].forEach(x=>panel.appendChild(x));
 bindStudentDrag576();panel.scrollTop=0;
}
const _renderInlinePanel5761=renderInlinePanel;renderInlinePanel=function(){_renderInlinePanel5761();requestAnimationFrame(finalizePanelBlocks5761)}
const _renderUnassigned5761=renderUnassigned;renderUnassigned=function(){_renderUnassigned5761();requestAnimationFrame(finalizePanelBlocks5761)}
const _renderCanvas5761=renderCanvas;renderCanvas=function(id='canvas',result=false){_renderCanvas5761(id,result);if(!result&&id==='canvas')requestAnimationFrame(finalizePanelBlocks5761)}
requestAnimationFrame(finalizePanelBlocks5761)

/* Gruppcentralen 6.1: valfri klassrumsrubrik och samlad export */
function ensureRoomMeta61(){
  if(!room)return;
  room.meta=room.meta&&typeof room.meta==='object'?room.meta:{};
  room.meta.className=room.meta.className||'';
  room.meta.subject=room.meta.subject||'';
  room.meta.lesson=room.meta.lesson||'';
}
function fillRoomMeta61(){
  ensureRoomMeta61();
  if(!room)return;
  if($('roomClass'))$('roomClass').value=room.meta.className;
  if($('roomSubject'))$('roomSubject').value=room.meta.subject;
  if($('roomLesson'))$('roomLesson').value=room.meta.lesson;
}
function updateRoomMeta(){
  if(!room)return;
  ensureRoomMeta61();
  room.meta.className=$('roomClass')?.value.trim()||'';
  room.meta.subject=$('roomSubject')?.value.trim()||'';
  room.meta.lesson=$('roomLesson')?.value.trim()||'';
  scheduleAutosave();
  updatePrintHeading61();
}
function roomHeadingParts61(){
  ensureRoomMeta61();
  return [room?.meta?.className,room?.meta?.subject,room?.meta?.lesson].filter(Boolean);
}
function updatePrintHeading61(){
  if(!room)return;
  let parts=roomHeadingParts61(),rn=$('printRoomName'),pn=$('printPlacementName');
  if(rn)rn.textContent=parts[0]||room.name||'Klassrum';
  if(pn){
    let active=room.placements?.find(p=>p.id===room.activePlacementId);
    let rest=parts.slice(1);
    if(active?.name)rest.push(active.name);
    pn.textContent=rest.join(' · ');
  }
}
const _openEditor61=openEditor;
openEditor=function(){
  _openEditor61();
  ensureRoomMeta61();
  fillRoomMeta61();
  updatePrintHeading61();
};
const _saveRoom61=saveRoom;
saveRoom=function(manual=false){
  if(room&&$('roomClass'))updateRoomMeta();
  return _saveRoom61(manual);
};
printPlacement=function(){
  if(!room)return;
  updateRoomMeta();
  updatePrintHeading61();
  window.print();
};

/* Gruppcentralen 6.1.4: helskarm som overlay, normallayouten lamnas orord */
function updateFsPanelButton614(){
  const b=$('classroomBuilder'),btn=$('gcFs614Toggle');
  if(!b||!btn)return;
  const hidden=b.classList.contains('fsPanel614Hidden');
  btn.textContent=hidden?'☰ Visa panel':'◀ Dölj panel';
  btn.setAttribute('aria-expanded',String(!hidden));
}
function toggleFsPanel614(){
  const b=$('classroomBuilder');
  if(!b)return;
  b.classList.toggle('fsPanel614Hidden');
  updateFsPanelButton614();
}
function resetFs614(){
  const b=$('classroomBuilder');
  if(!b)return;
  b.classList.remove('fsPanel614Hidden');
  updateFsPanelButton614();
}

/* Ersatter den aldre funktionen som flyttade den vanliga verktygsraden. */
toggleRoomFullscreen=function(){
  const el=$('classroomBuilder');
  if(!el)return;
  if(document.fullscreenElement){
    document.exitFullscreen().catch(()=>fallbackFullscreen(false));
  }else if(el.classList.contains('fullscreenFallback')){
    fallbackFullscreen(false);
  }else if(el.requestFullscreen){
    el.requestFullscreen().catch(()=>fallbackFullscreen(true));
  }else{
    fallbackFullscreen(true);
  }
};
const _fallbackFullscreen614=fallbackFullscreen;
fallbackFullscreen=function(on){
  _fallbackFullscreen614(on);
  if(!on)resetFs614();
};
document.addEventListener('fullscreenchange',()=>{
  if(!document.fullscreenElement)resetFs614();
  else updateFsPanelButton614();
});

/* ==========================================================
   Gruppcentralen 6.1.5 - anpassningsbar klassrumsyta
   Dra i nedre hogra hornet i Bygglage.
   ========================================================== */
const GC_CANVAS_DEFAULT_WIDTH=1000;
const GC_CANVAS_DEFAULT_HEIGHT=680;
const GC_CANVAS_MIN_WIDTH=700;
const GC_CANVAS_MIN_HEIGHT=500;
const GC_CANVAS_MAX_WIDTH=2400;
const GC_CANVAS_MAX_HEIGHT=1800;
const GC_CANVAS_SNAP=20;

function ensureCanvasSize615(){
  if(!room)return;
  room.canvasWidth=Math.max(GC_CANVAS_MIN_WIDTH,Math.min(GC_CANVAS_MAX_WIDTH,Number(room.canvasWidth)||GC_CANVAS_DEFAULT_WIDTH));
  room.canvasHeight=Math.max(GC_CANVAS_MIN_HEIGHT,Math.min(GC_CANVAS_MAX_HEIGHT,Number(room.canvasHeight)||GC_CANVAS_DEFAULT_HEIGHT));
}

function applyCanvasSize615(canvas){
  if(!room||!canvas)return;
  ensureCanvasSize615();
  canvas.style.setProperty('--room-width',room.canvasWidth+'px');
  canvas.style.setProperty('--room-height',room.canvasHeight+'px');
  canvas.style.width=room.canvasWidth+'px';
  canvas.style.height=room.canvasHeight+'px';
  canvas.style.minWidth=room.canvasWidth+'px';
  canvas.style.minHeight=room.canvasHeight+'px';
}

function canvasContentMinimum615(canvas){
  let maxX=GC_CANVAS_MIN_WIDTH,maxY=GC_CANVAS_MIN_HEIGHT;
  canvas.querySelectorAll(':scope > .obj').forEach(el=>{
    maxX=Math.max(maxX,el.offsetLeft+el.offsetWidth+50);
    maxY=Math.max(maxY,el.offsetTop+el.offsetHeight+50);
  });
  return {width:Math.ceil(maxX/GC_CANVAS_SNAP)*GC_CANVAS_SNAP,height:Math.ceil(maxY/GC_CANVAS_SNAP)*GC_CANVAS_SNAP};
}

function updateResizeLabel615(label,w,h){
  if(label)label.textContent=`${Math.round(w)} × ${Math.round(h)}`;
}

function installCanvasResize615(){
  const canvas=$('canvas');
  if(!canvas||!room)return;
  applyCanvasSize615(canvas);
  canvas.querySelector('.gcCanvasResize615')?.remove();
  canvas.querySelector('.gcCanvasSize615')?.remove();

  const label=document.createElement('div');
  label.className='gcCanvasSize615';
  updateResizeLabel615(label,room.canvasWidth,room.canvasHeight);

  const handle=document.createElement('button');
  handle.type='button';
  handle.className='gcCanvasResize615';
  handle.title='Dra för att ändra klassrummets storlek. Dubbelklicka för standardstorlek.';
  handle.setAttribute('aria-label','Ändra klassrummets storlek');
  handle.innerHTML='<span aria-hidden="true">◢</span>';

  canvas.append(label,handle);

  handle.addEventListener('dblclick',e=>{
    e.preventDefault();e.stopPropagation();
    if(room.layoutLocked)return toast('Lås upp ritningen först.');
    snapshotRoom();
    room.canvasWidth=GC_CANVAS_DEFAULT_WIDTH;
    room.canvasHeight=GC_CANVAS_DEFAULT_HEIGHT;
    applyCanvasSize615(canvas);
    updateResizeLabel615(label,room.canvasWidth,room.canvasHeight);
    scheduleAutosave();
    toast('Klassrumsytan återställdes.');
  });

  handle.addEventListener('pointerdown',e=>{
    e.preventDefault();e.stopPropagation();
    if(workMode!=='build')return;
    if(room.layoutLocked)return toast('Lås upp ritningen först.');
    snapshotRoom();
    const startX=e.clientX,startY=e.clientY,startW=room.canvasWidth,startH=room.canvasHeight;
    const scale=Math.max(.25,(canvasZoom||100)/100);
    const contentMin=canvasContentMinimum615(canvas);
    handle.setPointerCapture?.(e.pointerId);
    canvas.classList.add('gcCanvasResizing615');
    label.classList.add('show');

    const move=ev=>{
      let w=startW+(ev.clientX-startX)/scale;
      let h=startH+(ev.clientY-startY)/scale;
      w=Math.round(w/GC_CANVAS_SNAP)*GC_CANVAS_SNAP;
      h=Math.round(h/GC_CANVAS_SNAP)*GC_CANVAS_SNAP;
      room.canvasWidth=Math.max(contentMin.width,GC_CANVAS_MIN_WIDTH,Math.min(GC_CANVAS_MAX_WIDTH,w));
      room.canvasHeight=Math.max(contentMin.height,GC_CANVAS_MIN_HEIGHT,Math.min(GC_CANVAS_MAX_HEIGHT,h));
      applyCanvasSize615(canvas);
      updateResizeLabel615(label,room.canvasWidth,room.canvasHeight);
    };
    const end=()=>{
      handle.removeEventListener('pointermove',move);
      handle.removeEventListener('pointerup',end);
      handle.removeEventListener('pointercancel',end);
      canvas.classList.remove('gcCanvasResizing615');
      label.classList.remove('show');
      scheduleAutosave();
      toast(`Klassrumsytan är ${room.canvasWidth} × ${room.canvasHeight}.`);
    };
    handle.addEventListener('pointermove',move);
    handle.addEventListener('pointerup',end);
    handle.addEventListener('pointercancel',end);
  });
}

/* Koppla storleken till den slutliga renderCanvas-funktionen. */
const _renderCanvas615=renderCanvas;
renderCanvas=function(id='canvas',result=false){
  const value=_renderCanvas615(id,result);
  const canvas=$(id);
  if(canvas&&room)applyCanvasSize615(canvas);
  if(id==='canvas'&&!result)installCanvasResize615();
  return value;
};

/* Gamla klassrum far standardstorlek nar de oppnas. */
const _openEditor615=openEditor;
openEditor=function(){
  ensureCanvasSize615();
  const value=_openEditor615();
  requestAnimationFrame(installCanvasResize615);
  return value;
};

/* Gruppcentralen 6.2 - klassrumsmallar */
newRoom=function(){let d=$('templateModal');d?.showModal?d.showModal():d?.setAttribute('open','')};
function t62(type,seats,x,y,rotation=0){return{id:uid(),type,seats,x,y,rotation,scale:1,color:type==='round'?'#d7c5a3':'#e8b562',names:Array(seats).fill(''),lockedSeats:Array(seats).fill(false)}}
function c62(total,max){let n=Math.ceil(total/max),b=Math.floor(total/n),e=total%n;return Array.from({length:n},(_,i)=>b+(i<e?1:0))}
function buildTemplate62(k,seats){let r=ensureRoom52(blank());r.canvasWidth=1000;r.canvasHeight=680;r.tables=[];r.objects=[];r.name={blank:'Nytt klassrum',rows:'Rader',islands:'Bordsöar',u:'U-form',exam:'Provplacering'}[k];if(k==='blank')return r;r.objects.push({id:uid(),type:'board',x:370,y:22,rotation:0,scale:1.15,color:'#e9edf3'});if(k==='rows'){let a=c62(seats,2);a.forEach((n,i)=>r.tables.push(t62('rect',n,70+i%4*220,130+Math.floor(i/4)*145)));r.canvasHeight=Math.max(680,220+Math.ceil(a.length/4)*145)}if(k==='islands'){let a=c62(seats,6),cols=a.length<=4?2:3;a.forEach((n,i)=>r.tables.push(t62('round',n,115+i%cols*300,150+Math.floor(i/cols)*225)));r.canvasHeight=Math.max(680,260+Math.ceil(a.length/cols)*225)}if(k==='u'){let a=c62(seats,4),i=0,l=Math.ceil((a.length-2)/2),rr=a.length-2-l;for(let n=0;n<l;n++,i++)r.tables.push(t62('rect',a[i],90,150+n*145,90));let y=Math.max(430,150+Math.max(l,rr)*145);if(i<a.length)r.tables.push(t62('rect',a[i++],320,y));if(i<a.length)r.tables.push(t62('rect',a[i++],570,y));for(let n=0;n<rr&&i<a.length;n++,i++)r.tables.push(t62('rect',a[i],790,y-145-n*145,90));r.canvasHeight=Math.max(680,y+130)}if(k==='exam'){let cols=seats<=24?5:6;for(let i=0;i<seats;i++)r.tables.push(t62('square',1,80+i%cols*150,130+Math.floor(i/cols)*125));r.canvasHeight=Math.max(680,210+Math.ceil(seats/cols)*125)}return ensureRoom52(r)}
function createRoomFromTemplate62(k){room=buildTemplate62(k,Number($('templateSeats')?.value)||24);$('templateModal')?.close?.();openEditor();toast('Klassrummet skapades.')}

/* ==========================================================
   Gruppcentralen 6.3 - snabb elevslumpning
   Klassrumsbyggaren ar oforandrad fran 6.2.
   ========================================================== */
let studentRandomAbsent63=new Set();
let studentRandomRemaining63=[];
let studentRandomHistory63=[];
let studentRandomLastPoolKey63='';
let studentRandomNoRepeat63=true;

function studentEntries63(){
  const map=new Map();
  groups.filter(g=>randSel.has(g.id)).forEach(g=>g.students.forEach(name=>{
    const key=norm(name);
    if(!map.has(key))map.set(key,{name,groups:[g.name]});
    else if(!map.get(key).groups.includes(g.name))map.get(key).groups.push(g.name);
  }));
  return [...map.values()];
}
function activeStudentEntries63(){return studentEntries63().filter(x=>!studentRandomAbsent63.has(norm(x.name)))}
function studentPoolKey63(){return activeStudentEntries63().map(x=>norm(x.name)).sort().join('|')}
function syncStudentRound63(force=false){
  const key=studentPoolKey63();
  if(force||key!==studentRandomLastPoolKey63){
    studentRandomRemaining63=activeStudentEntries63();
    studentRandomHistory63=[];
    studentRandomLastPoolKey63=key;
  }
}
function toggleStudentAbsent63(encoded){
  const name=decodeURIComponent(encoded),key=norm(name);
  studentRandomAbsent63.has(key)?studentRandomAbsent63.delete(key):studentRandomAbsent63.add(key);
  syncStudentRound63(true);renderStudentRandom63();
}
function resetStudentAttendance63(){studentRandomAbsent63.clear();syncStudentRound63(true);renderStudentRandom63()}
function renderStudentAttendance63(){
  const target=$('studentRandomAttendance');if(!target)return;
  const entries=studentEntries63();
  target.innerHTML=entries.length?entries.map(x=>`<button type="button" class="studentRandomChip ${studentRandomAbsent63.has(norm(x.name))?'absent':''}" onclick="toggleStudentAbsent63('${encodeURIComponent(x.name)}')"><span>${esc(x.name)}</span><small>${studentRandomAbsent63.has(norm(x.name))?'Frånvarande':'Närvarande'}</small></button>`).join(''):'<span class="meta">Välj minst en elevgrupp.</span>';
}
function renderStudentRandom63(){
  if(!$('randomChecks'))return;
  $('randomChecks').innerHTML=checkHtml(randSel,'toggleRandom');
  $('randomEmptyGroups')?.classList.toggle('hide',groups.length>0);
  renderStudentAttendance63();
  const active=activeStudentEntries63();
  const absent=studentRandomAbsent63.size;
  $('randomInfo').textContent=`${active.length} närvarande${absent?' · '+absent+' frånvarande':''}`;
  const btn=$('studentRandomButton');if(btn)btn.disabled=!active.length;
  syncStudentRound63(false);
}
renderRandom=function(){renderStudentRandom63()};
toggleRandom=function(id){randSel.has(id)?randSel.delete(id):randSel.add(id);syncStudentRound63(true);renderStudentRandom63()};

function updateStudentResult63(entry){
  if(!entry)return;
  $('studentRandomBefore')?.classList.add('hide');$('studentRandomResult')?.classList.remove('hide');
  $('studentRandomName').textContent=entry.name;
  $('studentRandomGroup').textContent=entry.groups.join(' · ');
  const left=studentRandomNoRepeat63?studentRandomRemaining63.length:activeStudentEntries63().length;
  $('studentRandomRemaining').textContent=studentRandomNoRepeat63?`${left} elever kvar i omgången`:`Fri slumpning bland ${left} elever`;
  $('studentUndoButton').disabled=!studentRandomHistory63.length;
  $('studentRandomFullscreenName').textContent=entry.name;
  $('studentRandomFullscreenGroup').textContent=entry.groups.join(' · ');
  $('studentRandomFullscreenRemaining').textContent=$('studentRandomRemaining').textContent;
}
function drawStudent63(){
  studentRandomNoRepeat63=$('studentNoRepeat')?.checked!==false;
  let active=activeStudentEntries63();
  if(!active.length)return toast('Välj en elevgrupp med närvarande elever.');
  syncStudentRound63(false);
  let pool=studentRandomNoRepeat63?studentRandomRemaining63:active;
  if(!pool.length){studentRandomRemaining63=[...active];pool=studentRandomRemaining63;toast('Ny omgång startade.');}
  const index=Math.floor(Math.random()*pool.length),entry=pool[index];
  if(studentRandomNoRepeat63)studentRandomRemaining63.splice(index,1);
  studentRandomHistory63.push(entry);updateStudentResult63(entry);
}
function undoStudentDraw63(){
  if(!studentRandomHistory63.length)return;
  const removed=studentRandomHistory63.pop();
  if(studentRandomNoRepeat63&&!studentRandomRemaining63.some(x=>norm(x.name)===norm(removed.name)))studentRandomRemaining63.push(removed);
  const previous=studentRandomHistory63.at(-1);
  if(previous)updateStudentResult63(previous);else{$('studentRandomResult')?.classList.add('hide');$('studentRandomBefore')?.classList.remove('hide');}
}
function resetStudentRound63(){syncStudentRound63(true);$('studentRandomResult')?.classList.add('hide');$('studentRandomBefore')?.classList.remove('hide');toast('Omgången återställdes.')}
function toggleStudentFullscreen63(on){
  const box=$('studentRandomFullscreen');if(!box)return;
  const show=typeof on==='boolean'?on:box.classList.contains('hide');
  box.classList.toggle('hide',!show);document.body.classList.toggle('studentRandomFullscreenLock',show);
}

/* Gruppcentralen 6.4 - tydligare startsida */
const _updateHomeStatus64=updateHomeStatus;
updateHomeStatus=function(){
  _updateHomeStatus64();
  const totalStudents=groups.reduce((sum,g)=>sum+(g.students?.length||0),0);
  const randomCount=$('homeRandomCount');
  if(randomCount)randomCount.textContent=groups.length?`${groups.length} grupper · ${totalStudents} elever`:'Skapa en elevgrupp först';
  renderHomeQuickGroups64();
};
function renderHomeQuickGroups64(){
  const target=$('homeQuickGroups'),empty=$('homeQuickEmpty');
  if(!target)return;
  const recent=groups.slice(0,6);
  target.innerHTML=recent.map(g=>`<button type="button" onclick="openQuickRandom64('${g.id}')"><span>🎲</span><b>${esc(g.name)}</b><small>${g.students?.length||0} elever</small></button>`).join('');
  empty?.classList.toggle('hide',recent.length>0);
}
function openQuickRandom64(id){
  randSel=new Set([id]);
  studentRandomAbsent63?.clear?.();
  studentRandomRemaining63=[];
  studentRandomHistory63=[];
  studentRandomLastPoolKey63='';
  openWorkspace('random');
  requestAnimationFrame(()=>{
    renderStudentRandom63();
    $('studentRandomButton')?.focus();
  });
}
/* Uppdatera status direkt nar den nya startsidan laddas. */
requestAnimationFrame(updateHomeStatus);

/* Gruppcentralen 6.4.1 - tydligare elevslumpning */
let randomMulti641=false;
function toggleRandomMulti641(){randomMulti641=!randomMulti641;$('random641MultiButton').textContent=randomMulti641?'Klar':'Välj flera';renderStudentRandom641()}
function selectRandomGroup641(id){
  if(randomMulti641){randSel.has(id)?randSel.delete(id):randSel.add(id)}else{randSel=new Set([id])}
  studentRandomAbsent63.clear();syncStudentRound63(true);renderStudentRandom641();
}
function renderRandomGroups641(){
  const t=$('randomChecks');if(!t)return;
  t.innerHTML=groups.map(g=>{const selected=randSel.has(g.id);return `<button type="button" class="random641Group ${selected?'selected':''}" onclick="selectRandomGroup641('${g.id}')"><span class="random641Check">${selected?'✓':''}</span><span><b>${esc(g.name)}</b><small>${g.students.length} elever</small></span>${selected?'<em>Vald</em>':''}</button>`}).join('');
}
function renderStudentRandom641(){
  renderRandomGroups641();renderStudentAttendance63();
  $('randomEmptyGroups')?.classList.toggle('hide',groups.length>0);
  const active=activeStudentEntries63(),has=randSel.size>0,attendance=$('random641AttendanceStep');
  attendance?.classList.toggle('random641Locked',!has);
  const info=$('randomInfo');if(info)info.textContent=has?`${active.length} elever är med`:'0 elever valda';
  const btn=$('studentRandomButton');if(btn)btn.disabled=!active.length;
  const title=$('random641ReadyTitle'),text=$('random641ReadyText');
  if(title)title.textContent=has?'Redo att slumpa':'Välj en elevgrupp';
  if(text)text.textContent=has?'Markera frånvarande till vänster eller slumpa direkt.':'När gruppen är vald kan du slumpa fram en elev här.';
  syncStudentRound63(false);
}
renderStudentRandom63=renderStudentRandom641;
renderRandom=function(){renderStudentRandom641()};
toggleRandom=function(id){selectRandomGroup641(id)};

/* Korrekt rubrik for den nya huvudfunktionen. */
const _view641=view;
view=function(v){_view641(v);if(v==='random'){$('title').textContent='Slumpa en elev';$('sub').textContent='Välj en grupp och slumpa fram en elev snabbt och rättvist.';renderStudentRandom641()}};

/* Gruppcentralen 6.4.2 - flera grupper, snabblista och dolt gruppval */
let directStudents642=[];
let directStudentsActive642=false;
let groupPickerHidden642=false;

function parseDirectStudents642(){
  const raw=$('random642DirectNames')?.value||'';
  const seen=new Set();
  return raw.split(/\r?\n|;|\t/).map(x=>x.trim()).filter(name=>{
    const key=norm(name);if(!key||seen.has(key))return false;seen.add(key);return true;
  });
}
function toggleDirectStudents642(){
  $('random642DirectPanel')?.classList.toggle('hide');
}
function updateDirectStudents642(){
  const count=parseDirectStudents642().length;
  const button=$('random642DirectToggle');
  if(button)button.textContent=count?`✍ Snabblista · ${count} elever`:'✍ Skriv in elever direkt';
}
function useDirectStudents642(){
  directStudents642=parseDirectStudents642();
  if(!directStudents642.length)return toast('Skriv in minst ett elevnamn.');
  directStudentsActive642=true;
  randSel.clear();studentRandomAbsent63.clear();
  groupPickerHidden642=true;
  $('random642DirectPanel')?.classList.add('hide');
  syncStudentRound63(true);renderStudentRandom641();
}
function clearDirectStudents642(){
  if($('random642DirectNames'))$('random642DirectNames').value='';
  directStudents642=[];directStudentsActive642=false;groupPickerHidden642=false;
  updateDirectStudents642();syncStudentRound63(true);renderStudentRandom641();
}
function changeGroups642(){
  groupPickerHidden642=false;directStudentsActive642=false;directStudents642=[];
  studentRandomAbsent63.clear();syncStudentRound63(true);renderStudentRandom641();
}

/* Snabblistan deltar i samma slumpmotor som sparade grupper. */
const _studentEntries642=studentEntries63;
studentEntries63=function(){
  if(directStudentsActive642)return directStudents642.map(name=>({name,groups:['Snabblista']}));
  return _studentEntries642();
};

/* Flera grupper kan valjas direkt. Nar minst en grupp valts doljs valjaren. */
selectRandomGroup641=function(id){
  directStudentsActive642=false;directStudents642=[];
  randSel.has(id)?randSel.delete(id):randSel.add(id);
  studentRandomAbsent63.clear();
  groupPickerHidden642=randSel.size>0;
  syncStudentRound63(true);renderStudentRandom641();
};

toggleRandomMulti641=function(){
  randomMulti641=true;
  groupPickerHidden642=false;
  renderStudentRandom641();
};

const _renderStudentRandom641_642=renderStudentRandom641;
renderStudentRandom641=function(){
  _renderStudentRandom641_642();
  const has=directStudentsActive642||randSel.size>0;
  const step=$('randomChecks')?.closest('.random641Step');
  step?.classList.toggle('random642PickerHidden',groupPickerHidden642&&has);
  const chosen=$('random642Chosen');
  chosen?.classList.toggle('hide',!(groupPickerHidden642&&has));
  const names=$('random642ChosenNames');
  if(names){
    names.textContent=directStudentsActive642
      ?`Snabblista · ${directStudents642.length} elever`
      :groups.filter(g=>randSel.has(g.id)).map(g=>g.name).join(' + ');
  }
  const multi=$('random641MultiButton');
  if(multi)multi.textContent=randSel.size>1?`${randSel.size} grupper valda`:'Välj flera grupper';
};
renderStudentRandom63=renderStudentRandom641;
renderRandom=function(){renderStudentRandom641()};

/* ==========================================================
   Gruppcentralen 6.5 - flexibel gruppslumpning
   ========================================================== */
let groupMethod65='teams';
let groupValueTeams65=4;
let groupValueSize65=3;
let flexibleGroups65=[];

function groupStudents65(){return activeStudentEntries63().map(x=>x.name)}
function showGroupMode65(){
  $('studentModeTab65')?.classList.remove('active');$('groupModeTab65')?.classList.add('active');
  document.querySelector('.random641Layout')?.classList.add('hide');
  $('groupBuilder65')?.classList.remove('hide');
  updateGroupSetup65();
  $('title').textContent='Skapa grupper';$('sub').textContent='Fördela elever jämnt i grupper, lag eller stationer.';
}
function showStudentMode65(){
  $('groupModeTab65')?.classList.remove('active');$('studentModeTab65')?.classList.add('active');
  $('groupBuilder65')?.classList.add('hide');
  document.querySelector('.random641Layout')?.classList.remove('hide');
  $('title').textContent='Slumpa en elev';$('sub').textContent='Välj en grupp och slumpa fram en elev snabbt och rättvist.';
  renderStudentRandom641();
}
function setGroupMethod65(method){
  groupMethod65=method;
  $('methodTeams65')?.classList.toggle('active',method==='teams');
  $('methodSize65')?.classList.toggle('active',method==='size');
  updateGroupSetup65();
}
function changeGroupValue65(delta){
  if(groupMethod65==='teams')groupValueTeams65=Math.max(2,Math.min(8,groupValueTeams65+delta));
  else groupValueSize65=Math.max(2,Math.min(5,groupValueSize65+delta));
  updateGroupSetup65();
}
function balancedSizes65(total,count){
  const base=Math.floor(total/count),extra=total%count;
  return Array.from({length:count},(_,i)=>base+(i<extra?1:0));
}
function groupCountFromSize65(total,size){return Math.max(1,Math.ceil(total/size))}
function updateGroupSetup65(){
  const students=groupStudents65(),total=students.length;
  const value=groupMethod65==='teams'?groupValueTeams65:groupValueSize65;
  $('groupValue65').textContent=value;
  $('groupValueLabel65').textContent=groupMethod65==='teams'?'grupper':'elever per grupp';
  const count=groupMethod65==='teams'?Math.min(groupValueTeams65,Math.max(1,total)):groupCountFromSize65(total,groupValueSize65);
  const sizes=total?balancedSizes65(total,count):[];
  const selectedNames=directStudentsActive642?'Snabblista':groups.filter(g=>randSel.has(g.id)).map(g=>g.name).join(' + ');
  $('groupSourceSummary65').textContent=total?`${selectedNames||'Valda elever'} · ${total} elever`:'Välj grupper eller en snabblista i fliken En elev';
  $('groupEstimate65').textContent=total?`${total} elever fördelas på ${count} ${count===1?'grupp':'grupper'}: ${sizes.join(' + ')} elever.`:'Inga elever valda ännu.';
  const btn=$('createGroupsButton65');if(btn)btn.disabled=total<2;
}
function createFlexibleGroups65(){
  const students=shuffle([...groupStudents65()]);
  if(students.length<2)return toast('Välj minst två närvarande elever.');
  let count=groupMethod65==='teams'?Math.min(groupValueTeams65,students.length):groupCountFromSize65(students.length,groupValueSize65);
  count=Math.max(1,count);
  const sizes=balancedSizes65(students.length,count),prefix=$('groupPrefix65')?.value||'Grupp';
  flexibleGroups65=[];let index=0;
  sizes.forEach((size,i)=>{flexibleGroups65.push({name:`${prefix} ${i+1}`,students:students.slice(index,index+size)});index+=size});
  renderFlexibleGroups65();
}
function groupCardsMarkup65(groups){return groups.map((g,i)=>`<article class="groupCard65"><header><span>${i+1}</span><div><h3>${esc(g.name)}</h3><small>${g.students.length} elever</small></div></header><ol>${g.students.map(n=>`<li>${esc(n)}</li>`).join('')}</ol></article>`).join('')}
function renderFlexibleGroups65(){
  $('groupBefore65')?.classList.add('hide');$('groupResult65')?.classList.remove('hide');
  const total=flexibleGroups65.reduce((n,g)=>n+g.students.length,0);
  const title=`${total} elever · ${flexibleGroups65.length} grupper`;
  $('groupResultTitle65').textContent=title;
  $('groupCards65').innerHTML=groupCardsMarkup65(flexibleGroups65);
  $('groupsFullscreenTitle65').textContent=title;
  $('groupsFullscreenCards65').innerHTML=groupCardsMarkup65(flexibleGroups65);
}
function resetGroups65(){flexibleGroups65=[];$('groupResult65')?.classList.add('hide');$('groupBefore65')?.classList.remove('hide');updateGroupSetup65()}
function toggleGroupsFullscreen65(on){
  if(!flexibleGroups65.length)return toast('Skapa grupper först.');
  const box=$('groupsFullscreen65'),show=typeof on==='boolean'?on:box.classList.contains('hide');
  box.classList.toggle('hide',!show);document.body.classList.toggle('studentRandomFullscreenLock',show);
}

/* Gruppfliken uppdateras nar elevurval eller franvaro andras. */
const _renderStudentRandom641_65=renderStudentRandom641;
renderStudentRandom641=function(){_renderStudentRandom641_65();updateGroupSetup65()};
renderStudentRandom63=renderStudentRandom641;

/* Gruppcentralen 6.5.1 - kompakt elevpanel och storre slumpyta */
let attendanceCollapsed651=false;
function toggleAttendance651(){
  attendanceCollapsed651=!attendanceCollapsed651;
  const list=$('studentRandomAttendance'),button=$('toggleAttendance651');
  list?.classList.toggle('attendanceCollapsed651',attendanceCollapsed651);
  if(button)button.textContent=attendanceCollapsed651?'Visa elever':'Dölj elever';
  updateAttendanceSummary651();
}
function updateAttendanceSummary651(){
  const summary=$('attendanceSummary651');if(!summary)return;
  const total=studentEntries63().length,active=activeStudentEntries63().length,absent=Math.max(0,total-active);
  summary.textContent=total?`${active} närvarande${absent?` · ${absent} frånvarande`:''}`:'Inga elever valda';
  summary.classList.toggle('show',attendanceCollapsed651);
}
function openStudentReadyFullscreen651(){
  const active=activeStudentEntries63();
  if(!active.length)return toast('Välj minst en närvarande elev.');
  $('studentRandomFullscreenName').textContent='Redo att slumpa';
  $('studentRandomFullscreenGroup').textContent=directStudentsActive642?'Snabblista':groups.filter(g=>randSel.has(g.id)).map(g=>g.name).join(' + ');
  $('studentRandomFullscreenRemaining').textContent=`${active.length} elever är med`;
  toggleStudentFullscreen63(true);
}
function createGroupsFullscreen651(){
  createFlexibleGroups65();
  if(flexibleGroups65.length)toggleGroupsFullscreen65(true);
}

/* Hall sammanfattning och helskarmsknappar uppdaterade. */
const _renderStudentRandom641_651=renderStudentRandom641;
renderStudentRandom641=function(){
  _renderStudentRandom641_651();
  updateAttendanceSummary651();
  $('studentRandomAttendance')?.classList.toggle('attendanceCollapsed651',attendanceCollapsed651);
  const has=activeStudentEntries63().length>0;
  if($('studentReadyFullscreen651'))$('studentReadyFullscreen651').disabled=!has;
  if($('createGroupsFullscreen651'))$('createGroupsFullscreen651').disabled=activeStudentEntries63().length<2;
};
renderStudentRandom63=renderStudentRandom641;

const _updateGroupSetup651=updateGroupSetup65;
updateGroupSetup65=function(){
  _updateGroupSetup651();
  if($('createGroupsFullscreen651'))$('createGroupsFullscreen651').disabled=groupStudents65().length<2;
};

/* Gruppcentralen 6.6 - idrott, lag och stationer */
let sportsSelected66=new Set(),sportsAbsent66=new Set(),sportsDirectList66=[],sportsDirectActive66=false,sportsPickerHidden66=false;
let sportsType66='teams',sportsCountValue66=4,sportsGroupsResult66=[];
function sportsEntries66(){
  if(sportsDirectActive66)return sportsDirectList66.map(name=>({name,group:'Snabblista'}));
  const map=new Map();groups.filter(g=>sportsSelected66.has(g.id)).forEach(g=>g.students.forEach(name=>{const k=norm(name);if(!map.has(k))map.set(k,{name,group:g.name})}));return [...map.values()];
}
function sportsActive66(){return sportsEntries66().filter(x=>!sportsAbsent66.has(norm(x.name)))}
function renderSports66(){
  const list=$('sportsGroups66');if(!list)return;
  list.innerHTML=groups.map(g=>`<button class="${sportsSelected66.has(g.id)?'selected':''}" onclick="toggleSportsGroup66('${g.id}')"><span>${sportsSelected66.has(g.id)?'✓':''}</span><b>${esc(g.name)}</b><small>${g.students.length} elever</small></button>`).join('');
  const has=sportsDirectActive66||sportsSelected66.size>0;
  list.classList.toggle('hide',sportsPickerHidden66&&has);document.querySelector('.sportsDirectToggle66')?.classList.toggle('hide',sportsPickerHidden66&&has);
  $('sportsChosen66')?.classList.toggle('hide',!(sportsPickerHidden66&&has));
  $('sportsChosenText66').textContent=sportsDirectActive66?`Snabblista · ${sportsDirectList66.length} elever`:groups.filter(g=>sportsSelected66.has(g.id)).map(g=>g.name).join(' + ');
  $('sportsAttendanceWrap66')?.classList.toggle('sportsLocked66',!has);
  $('sportsAttendance66').innerHTML=sportsEntries66().map(x=>`<button class="${sportsAbsent66.has(norm(x.name))?'absent':''}" onclick="toggleSportsAbsent66('${encodeURIComponent(x.name)}')"><b>${esc(x.name)}</b><small>${sportsAbsent66.has(norm(x.name))?'Frånvarande':'Med'}</small></button>`).join('');
  const total=sportsActive66().length,count=sportsType66==='pairs'?Math.ceil(total/2):Math.min(sportsCountValue66,Math.max(1,total));
  const sizes=total?balancedSizes65(total,count):[];
  $('sportsEstimate66').textContent=total?`${total} elever → ${count} ${sportsType66==='stations'?'stationer':sportsType66==='pairs'?'par/grupper':'lag'} · ${sizes.join(' + ')}`:'Välj minst två elever.';
  $('sportsCount66').textContent=sportsCountValue66;$('sportsCountLabel66').textContent=sportsType66==='stations'?'stationer':'lag';$('sportsCounter66')?.classList.toggle('hide',sportsType66==='pairs');
  const ok=total>=2;$('sportsCreate66').disabled=!ok;$('sportsCreateFs66').disabled=!ok;
  $('sportsCreate66').textContent=`🎲 Skapa ${sportsType66==='stations'?'stationer':sportsType66==='pairs'?'par':'lag'}`;
}
function toggleSportsGroup66(id){sportsDirectActive66=false;sportsSelected66.has(id)?sportsSelected66.delete(id):sportsSelected66.add(id);sportsAbsent66.clear();sportsPickerHidden66=sportsSelected66.size>0;renderSports66()}
function toggleSportsDirect66(){$('sportsDirect66')?.classList.toggle('hide')}
function useSportsDirect66(){const seen=new Set();sportsDirectList66=($('sportsDirectNames66')?.value||'').split(/\r?\n|;|\t/).map(x=>x.trim()).filter(x=>{const k=norm(x);if(!k||seen.has(k))return false;seen.add(k);return true});if(!sportsDirectList66.length)return toast('Skriv in minst två namn.');sportsDirectActive66=true;sportsSelected66.clear();sportsPickerHidden66=true;sportsAbsent66.clear();$('sportsDirect66')?.classList.add('hide');renderSports66()}
function changeSportsStudents66(){sportsPickerHidden66=false;sportsDirectActive66=false;sportsDirectList66=[];sportsAbsent66.clear();renderSports66()}
function toggleSportsAbsent66(v){const k=norm(decodeURIComponent(v));sportsAbsent66.has(k)?sportsAbsent66.delete(k):sportsAbsent66.add(k);renderSports66()}
function resetSportsAttendance66(){sportsAbsent66.clear();renderSports66()}
function setSportsType66(t){sportsType66=t;['teams','stations','pairs'].forEach(x=>$(`sports${x[0].toUpperCase()+x.slice(1)}66`)?.classList.toggle('active',x===t));renderSports66()}
function changeSportsCount66(d){sportsCountValue66=Math.max(2,Math.min(8,sportsCountValue66+d));renderSports66()}
function createSportsGroups66(){
  let names=sportsActive66().map(x=>x.name);if(names.length<2)return toast('Välj minst två elever.');
  if($('sportsKeep66')?.checked&&sportsGroupsResult66.length){renderSportsResults66();return toast('Lagen behölls.');}
  names=shuffle(names);let count=sportsType66==='pairs'?Math.ceil(names.length/2):Math.min(sportsCountValue66,names.length),sizes=balancedSizes65(names.length,count),prefix=sportsType66==='stations'?'Station':sportsType66==='pairs'?'Par':'Lag',i=0;
  sportsGroupsResult66=sizes.map((n,idx)=>({name:`${prefix} ${idx+1}`,students:names.slice(i,i+=n),color:idx%6}));renderSportsResults66();
}
function sportsMarkup66(){return sportsGroupsResult66.map(g=>`<article class="sportsCard66 c${g.color}"><h3>${esc(g.name)}</h3><small>${g.students.length} elever</small><ul>${g.students.map(n=>`<li>${esc(n)}</li>`).join('')}</ul></article>`).join('')}
function renderSportsResults66(){const total=sportsGroupsResult66.reduce((n,g)=>n+g.students.length,0),title=`${total} elever · ${sportsGroupsResult66.length} ${sportsType66==='stations'?'stationer':sportsType66==='pairs'?'par/grupper':'lag'}`;$('sportsBefore66')?.classList.add('hide');$('sportsResult66')?.classList.remove('hide');$('sportsResultTitle66').textContent=title;$('sportsCards66').innerHTML=sportsMarkup66();$('sportsFsTitle66').textContent=title;$('sportsFsCards66').innerHTML=sportsMarkup66()}
function createSportsFullscreen66(){createSportsGroups66();if(sportsGroupsResult66.length)toggleSportsFullscreen66(true)}
function toggleSportsFullscreen66(on){if(!sportsGroupsResult66.length)return toast('Skapa indelningen först.');const b=$('sportsFullscreen66'),show=typeof on==='boolean'?on:b.classList.contains('hide');b.classList.toggle('hide',!show);document.body.classList.toggle('studentRandomFullscreenLock',show)}
function resetSports66(){sportsGroupsResult66=[];$('sportsResult66')?.classList.add('hide');$('sportsBefore66')?.classList.remove('hide');$('sportsKeep66').checked=false}

const _view66=view;
view=function(v){
  if(v!=='sports')return _view66(v);
  document.querySelectorAll('nav button').forEach(b=>b.classList.toggle('active',b.dataset.v===v));document.querySelectorAll('.view').forEach(x=>x.classList.add('hide'));$('sports').classList.remove('hide');$('title').textContent='Idrott & stationer';$('sub').textContent='Skapa lag, stationer eller par snabbt.';renderSports66();
};

/* ==========================================================
   Gruppcentralen 6.6.1 - skriv endast ut klassrummet
   En separat utskriftskopia skapas. Ovriga delar av appen ingar inte.
   ========================================================== */
function removeClassroomPrintRoot661(){
  document.getElementById('classroomPrintOnly661')?.remove();
  document.body.classList.remove('printClassroomOnly661');
}
function buildClassroomPrintRoot661(){
  removeClassroomPrintRoot661();
  if(!room)return null;
  try{updateRoomMeta?.()}catch(e){}
  try{updatePrintHeading61?.()}catch(e){}

  const source=$('canvas');
  if(!source)return null;
  const root=document.createElement('main');
  root.id='classroomPrintOnly661';
  root.className='classroomPrintOnly661';

  const heading=document.createElement('header');
  heading.className='classroomPrintHeading661';
  const title=($('printRoomName')?.textContent||room.name||'Klassrum').trim();
  const subtitle=($('printPlacementName')?.textContent||'').trim();
  heading.innerHTML=`<h1>${esc(title)}</h1>${subtitle?`<p>${esc(subtitle)}</p>`:''}`;

  const frame=document.createElement('section');
  frame.className='classroomPrintFrame661';
  const clone=source.cloneNode(true);
  clone.id='classroomPrintCanvas661';
  clone.querySelectorAll('button,.rotateHandle,.rotateStem,.gcCanvasResize615,.gcCanvasSize615').forEach(el=>el.remove());
  clone.querySelectorAll('.selected').forEach(el=>el.classList.remove('selected'));
  frame.appendChild(clone);
  root.append(heading,frame);
  document.body.appendChild(root);
  document.body.classList.add('printClassroomOnly661');
  return root;
}

/* Ersatter tidigare utskrift: bara rubrik och klassrumsyta skrivs ut. */
printPlacement=function(){
  if(!room)return;
  const root=buildClassroomPrintRoot661();
  if(!root)return toast('Klassrummet kunde inte förberedas för utskrift.');
  requestAnimationFrame(()=>requestAnimationFrame(()=>window.print()));
};
window.addEventListener('afterprint',removeClassroomPrintRoot661);

/* ==========================================================
   Gruppcentralen 6.6.2 - automatisk anpassning till en utskriftssida
   ========================================================== */
function fitClassroomPrintToOnePage662(){
  const canvas=document.getElementById('classroomPrintCanvas661');
  const frame=document.querySelector('.classroomPrintFrame661');
  const heading=document.querySelector('.classroomPrintHeading661');
  if(!canvas||!frame)return;

  /* A4 liggande med 10 mm marginal: cirka 1047 x 718 CSS-pixlar vid 96 dpi.
     En liten sakerhetsmarginal minskar risken for en extra tom sida. */
  const pageWidth=1010;
  const pageHeight=680;
  const headingHeight=heading?Math.ceil(heading.getBoundingClientRect().height):0;
  const availableHeight=Math.max(260,pageHeight-headingHeight-18);
  const roomWidth=Math.max(1,canvas.scrollWidth,Number(room?.canvasWidth)||0);
  const roomHeight=Math.max(1,canvas.scrollHeight,Number(room?.canvasHeight)||0);
  const scale=Math.min(1,pageWidth/roomWidth,availableHeight/roomHeight);

  canvas.style.setProperty('--print-scale-662',String(scale));
  canvas.style.transform=`scale(${scale})`;
  frame.style.width=`${Math.ceil(roomWidth*scale)}px`;
  frame.style.height=`${Math.ceil(roomHeight*scale)}px`;
  frame.dataset.printScale=scale.toFixed(3);
}

const _buildClassroomPrintRoot662=buildClassroomPrintRoot661;
buildClassroomPrintRoot661=function(){
  const root=_buildClassroomPrintRoot662();
  if(root){
    requestAnimationFrame(()=>fitClassroomPrintToOnePage662());
  }
  return root;
};

printPlacement=function(){
  if(!room)return;
  const root=buildClassroomPrintRoot661();
  if(!root)return toast('Klassrummet kunde inte förberedas för utskrift.');
  requestAnimationFrame(()=>requestAnimationFrame(()=>{
    fitClassroomPrintToOnePage662();
    requestAnimationFrame(()=>window.print());
  }));
};

/* ==========================================================
   Gruppcentralen 6.6.3 - stabil utskrift pa exakt en sida
   Chrome paginerar transformerade element efter deras oskalade box.
   Darfor anvands CSS zoom, som ocksa skalar layoutboxen.
   ========================================================== */
function fitClassroomPrintToOnePage663(){
  const canvas=document.getElementById('classroomPrintCanvas661');
  const frame=document.querySelector('.classroomPrintFrame661');
  const root=document.getElementById('classroomPrintOnly661');
  const heading=document.querySelector('.classroomPrintHeading661');
  if(!canvas||!frame||!root)return;

  const roomWidth=Math.max(1,Number(room?.canvasWidth)||canvas.scrollWidth||canvas.offsetWidth);
  const roomHeight=Math.max(1,Number(room?.canvasHeight)||canvas.scrollHeight||canvas.offsetHeight);

  /* Saker utskriftsyta inom A4 liggande, aven nar Chrome visar
     sidhuvud/sidfot. Vardena ar medvetet nagot konservativa. */
  const printableWidth=980;
  const printableHeight=610;
  const headingHeight=heading&&heading.textContent.trim()?Math.ceil(heading.offsetHeight):0;
  const availableHeight=Math.max(250,printableHeight-headingHeight-14);
  const scale=Math.min(1,printableWidth/roomWidth,availableHeight/roomHeight);

  canvas.style.transform='none';
  canvas.style.removeProperty('--print-scale-662');
  canvas.style.zoom=String(scale);
  canvas.style.width=`${roomWidth}px`;
  canvas.style.height=`${roomHeight}px`;
  canvas.style.minWidth='0';
  canvas.style.minHeight='0';

  frame.style.width=`${Math.ceil(roomWidth*scale)}px`;
  frame.style.height=`${Math.ceil(roomHeight*scale)}px`;
  frame.style.maxWidth='100%';
  frame.style.overflow='hidden';

  root.style.height=`${Math.ceil(headingHeight+roomHeight*scale+14)}px`;
  root.style.maxHeight=`${printableHeight}px`;
  root.dataset.printScale=scale.toFixed(3);
}

/* Den senaste anpassningen ersatter 6.6.2 helt. */
printPlacement=function(){
  if(!room)return;
  const root=buildClassroomPrintRoot661();
  if(!root)return toast('Klassrummet kunde inte förberedas för utskrift.');
  requestAnimationFrame(()=>requestAnimationFrame(()=>{
    fitClassroomPrintToOnePage663();
    requestAnimationFrame(()=>window.print());
  }));
};

/* 6.6.4 compatibility: temporary classroom students */
function ensureTemporaryStudents664(r=room){if(!r)return[];r.temporaryStudents=Array.isArray(r.temporaryStudents)?r.temporaryStudents.map(String).map(x=>x.trim()).filter(Boolean):[];r.temporaryStudents=[...new Map(r.temporaryStudents.map(n=>[norm(n),n])).values()];return r.temporaryStudents}
function toggleTemporaryStudents664(show){let f=$('temporaryStudentsForm664');if(!f)return;let open=typeof show==='boolean'?show:f.classList.contains('hide');f.classList.toggle('hide',!open);if(open)requestAnimationFrame(()=>$('temporaryStudentsNames664')?.focus())}
function addTemporaryStudents664(){if(!room)return;let seen=new Set(ensureTemporaryStudents664().map(norm)),names=($('temporaryStudentsNames664')?.value||'').split(/\r?\n|;|\t/).map(x=>x.trim()).filter(Boolean),added=0;names.forEach(n=>{if(!seen.has(norm(n))){room.temporaryStudents.push(n);seen.add(norm(n));added++}});if($('temporaryStudentsNames664'))$('temporaryStudentsNames664').value='';toggleTemporaryStudents664(false);scheduleAutosave();renderInlinePanel();toast(added?`${added} tillfälliga elever lades till.`:'Inga nya elever lades till.')}
function removeTemporaryStudent664(v){let n=decodeURIComponent(v);if(!confirm(`Ta bort ”${n}” från klassrummet?`))return;room.temporaryStudents=ensureTemporaryStudents664().filter(x=>norm(x)!==norm(n));room.tables.forEach(t=>t.names=t.names.map(x=>norm(x)===norm(n)?'':x));scheduleAutosave();renderCanvas()}
function renderTemporaryStudents664(){let b=$('temporaryStudentsList664');if(!b||!room)return;let a=ensureTemporaryStudents664();b.innerHTML=a.length?`<div class="temporaryStudentsChips664">${a.map(n=>`<span><b>${esc(n)}</b><small>Tillfällig</small><button onclick="removeTemporaryStudent664('${encodeURIComponent(n)}')">×</button></span>`).join('')}</div>`:''}
const _inlineStudents665=inlineStudents;inlineStudents=function(){let a=_inlineStudents665(),seen=new Set(a.map(norm));ensureTemporaryStudents664().forEach(n=>{if(!seen.has(norm(n)))a.push(n)});return a};
const _renderInlinePanel665=renderInlinePanel;renderInlinePanel=function(){_renderInlinePanel665();renderTemporaryStudents664()};
const _placementSnapshot665=placementSnapshot;placementSnapshot=function(name){let p=_placementSnapshot665(name);p.temporaryStudents=[...ensureTemporaryStudents664()];return p};
const _loadPlacement665=loadPlacement;loadPlacement=function(id){let p=id&&room?.placements?.find(x=>x.id===id);_loadPlacement665(id);if(p){room.temporaryStudents=[...(p.temporaryStudents||[])];renderInlinePanel();scheduleAutosave()}};
const _openEditor665=openEditor;openEditor=function(){ensureTemporaryStudents664();return _openEditor665()};

/* ==========================================================
   6.6.5: exact one-page print without clipping.
   The canvas keeps original dimensions inside a scaled wrapper.
   The wrapper alone participates in page layout.
   ========================================================== */
function fitClassroomPrintToOnePage665(){
  const canvas=document.getElementById('classroomPrintCanvas661');
  const frame=document.querySelector('.classroomPrintFrame661');
  const root=document.getElementById('classroomPrintOnly661');
  const heading=document.querySelector('.classroomPrintHeading661');
  if(!canvas||!frame||!root)return;
  const rw=Math.max(1,Number(room?.canvasWidth)||canvas.scrollWidth||canvas.offsetWidth);
  const rh=Math.max(1,Number(room?.canvasHeight)||canvas.scrollHeight||canvas.offsetHeight);
  const headingH=heading&&heading.textContent.trim()?Math.ceil(heading.getBoundingClientRect().height):0;
  /* Safe printable area for A4 landscape with standard browser headers/footers. */
  const maxW=940,maxH=Math.max(300,520-headingH);
  const scale=Math.min(1,maxW/rw,maxH/rh);
  canvas.style.zoom='1';
  canvas.style.width=`${rw}px`;canvas.style.height=`${rh}px`;
  canvas.style.minWidth=`${rw}px`;canvas.style.minHeight=`${rh}px`;
  canvas.style.transform=`scale(${scale})`;
  canvas.style.transformOrigin='top left';
  canvas.style.position='absolute';canvas.style.inset='0 auto auto 0';
  frame.style.width=`${Math.floor(rw*scale)}px`;
  frame.style.height=`${Math.floor(rh*scale)}px`;
  frame.style.position='relative';frame.style.overflow='visible';
  root.style.height='auto';root.style.maxHeight='none';
  root.dataset.printScale=scale.toFixed(4);
}
printPlacement=function(){if(!room)return;let root=buildClassroomPrintRoot661();if(!root)return toast('Klassrummet kunde inte förberedas för utskrift.');requestAnimationFrame(()=>requestAnimationFrame(()=>{fitClassroomPrintToOnePage665();requestAnimationFrame(()=>window.print())}))};

/* ==========================================================
   6.6.6 - utskrift med verkliga matt fran den synliga klassrumsytan
   Tidigare kod litade for mycket pa sparade room.canvasHeight.
   ========================================================== */
function actualClassroomBounds666(source){
  const rect=source.getBoundingClientRect();
  const style=getComputedStyle(source);
  let width=Math.max(source.scrollWidth,source.offsetWidth,parseFloat(style.width)||0,Number(room?.canvasWidth)||0);
  let height=Math.max(source.scrollHeight,source.offsetHeight,parseFloat(style.height)||0,Number(room?.canvasHeight)||0);
  source.querySelectorAll(':scope > .obj').forEach(el=>{
    const r=el.getBoundingClientRect();
    const sx=rect.width?width/rect.width:1;
    const sy=rect.height?height/rect.height:1;
    width=Math.max(width,(r.right-rect.left)*sx+12);
    height=Math.max(height,(r.bottom-rect.top)*sy+12);
  });
  return {width:Math.ceil(width),height:Math.ceil(height)};
}

const _buildClassroomPrintRoot666=buildClassroomPrintRoot661;
buildClassroomPrintRoot661=function(){
  const source=$('canvas');
  if(!source)return null;
  const bounds=actualClassroomBounds666(source);
  const root=_buildClassroomPrintRoot666();
  const clone=document.getElementById('classroomPrintCanvas661');
  if(clone){
    clone.dataset.actualWidth=String(bounds.width);
    clone.dataset.actualHeight=String(bounds.height);
    clone.style.setProperty('--room-width',bounds.width+'px');
    clone.style.setProperty('--room-height',bounds.height+'px');
  }
  return root;
};

function fitClassroomPrintToOnePage666(){
  const canvas=document.getElementById('classroomPrintCanvas661');
  const frame=document.querySelector('.classroomPrintFrame661');
  const root=document.getElementById('classroomPrintOnly661');
  const heading=document.querySelector('.classroomPrintHeading661');
  if(!canvas||!frame||!root)return;

  const rw=Math.max(1,Number(canvas.dataset.actualWidth)||canvas.scrollWidth||canvas.offsetWidth);
  const rh=Math.max(1,Number(canvas.dataset.actualHeight)||canvas.scrollHeight||canvas.offsetHeight);
  const headingH=heading&&heading.textContent.trim()?Math.ceil(heading.getBoundingClientRect().height):0;

  /* Saker yta for A4 liggande med webblasarens sidhuvud och sidfot. */
  const maxW=930;
  const maxH=Math.max(260,500-headingH);
  const scale=Math.min(1,maxW/rw,maxH/rh);
  const scaledW=Math.floor(rw*scale);
  const scaledH=Math.floor(rh*scale);

  canvas.style.cssText+=`;position:absolute!important;top:0!important;left:0!important;width:${rw}px!important;height:${rh}px!important;min-width:${rw}px!important;min-height:${rh}px!important;max-width:none!important;max-height:none!important;zoom:1!important;transform:scale(${scale})!important;transform-origin:top left!important;overflow:visible!important;`;
  frame.style.cssText+=`;position:relative!important;width:${scaledW}px!important;height:${scaledH}px!important;min-width:${scaledW}px!important;min-height:${scaledH}px!important;max-width:${scaledW}px!important;max-height:${scaledH}px!important;margin:0 auto!important;overflow:visible!important;`;
  root.style.cssText+=`;height:${headingH+scaledH+12}px!important;min-height:0!important;max-height:none!important;overflow:visible!important;`;
  root.dataset.printScale=scale.toFixed(4);
  root.dataset.roomSize=`${rw}x${rh}`;
}

printPlacement=function(){
  if(!room)return;
  const root=buildClassroomPrintRoot661();
  if(!root)return toast('Klassrummet kunde inte förberedas för utskrift.');
  requestAnimationFrame(()=>requestAnimationFrame(()=>{
    fitClassroomPrintToOnePage666();
    requestAnimationFrame(()=>window.print());
  }));
};

/* ==========================================================
   Gruppcentralen 6.6.7 - valbart sidformat och riktig fyll-sidan
   Utskriftskopian byggs i slutlig storlek. Ingen container transformeras.
   ========================================================== */
let printChoice667={orientation:'auto',fit:'fill'};
function openClassroomPrintSettings667(){
  if(!room)return;
  const d=$('printSettings667');
  if(d?.showModal)d.showModal();else d?.setAttribute('open','');
}

/* Dela och skriv ut anropar nu installningsrutan. */
printPlacement=function(){openClassroomPrintSettings667()};

function originalRoomSize667(source){
  const cs=getComputedStyle(source);
  return {
    width:Math.max(1,Number(room?.canvasWidth)||parseFloat(cs.width)||source.offsetWidth||1000),
    height:Math.max(1,Number(room?.canvasHeight)||parseFloat(cs.height)||source.offsetHeight||680)
  };
}
function pageBox667(orientation,fit){
  /* CSS-pixlar med sakerhetsutrymme for Chromes sidhuvud/sidfot. */
  const padding=fit==='fill'?10:38;
  if(orientation==='portrait')return {width:700-padding*2,height:980-padding*2,label:'portrait'};
  return {width:1000-padding*2,height:680-padding*2,label:'landscape'};
}
function chooseOrientation667(roomW,roomH,headingH,requested,fit){
  if(requested!=='auto')return requested;
  const land=pageBox667('landscape',fit),port=pageBox667('portrait',fit);
  const sl=Math.min(land.width/roomW,(land.height-headingH)/roomH);
  const sp=Math.min(port.width/roomW,(port.height-headingH)/roomH);
  return sp>sl?'portrait':'landscape';
}
function scaledTransform667(value,scale){
  const text=value&&value!=='none'?value:'';
  const match=text.match(/scale\(([-.\d]+)\)/);
  if(match)return text.replace(match[0],`scale(${Number(match[1])*scale})`);
  return `${text} scale(${scale})`.trim();
}
function buildClassroomPrint667(orientation,fit){
  removeClassroomPrintRoot661();
  const source=$('canvas');if(!source||!room)return null;
  try{updateRoomMeta?.()}catch(e){}
  try{updatePrintHeading61?.()}catch(e){}

  const size=originalRoomSize667(source);
  const title=($('printRoomName')?.textContent||room.name||'Klassrum').trim();
  const subtitle=($('printPlacementName')?.textContent||'').trim();
  const headingEstimate=subtitle?72:52;
  const chosen=chooseOrientation667(size.width,size.height,headingEstimate,orientation,fit);
  const box=pageBox667(chosen,fit);
  const scale=Math.min(box.width/size.width,(box.height-headingEstimate)/size.height);
  const finalW=Math.floor(size.width*scale),finalH=Math.floor(size.height*scale);

  let pageStyle=document.getElementById('printPageStyle667');
  if(!pageStyle){pageStyle=document.createElement('style');pageStyle.id='printPageStyle667';document.head.appendChild(pageStyle)}
  pageStyle.textContent=`@media print{@page{size:A4 ${chosen};margin:5mm}}`;

  const root=document.createElement('main');root.id='classroomPrintOnly661';root.className='classroomPrintOnly661 printRoot667';
  const heading=document.createElement('header');heading.className='classroomPrintHeading661';
  heading.innerHTML=`<h1>${esc(title)}</h1>${subtitle?`<p>${esc(subtitle)}</p>`:''}`;
  const frame=document.createElement('section');frame.className='classroomPrintFrame661 printFrame667';
  frame.style.width=finalW+'px';frame.style.height=finalH+'px';

  const clone=source.cloneNode(true);clone.id='classroomPrintCanvas661';clone.classList.add('printCanvas667');
  clone.querySelectorAll('button,.rotateHandle,.rotateStem,.gcCanvasResize615,.gcCanvasSize615').forEach(x=>x.remove());
  clone.querySelectorAll('.selected').forEach(x=>x.classList.remove('selected'));
  clone.style.cssText=`position:relative!important;width:${finalW}px!important;height:${finalH}px!important;min-width:${finalW}px!important;min-height:${finalH}px!important;max-width:${finalW}px!important;max-height:${finalH}px!important;transform:none!important;zoom:1!important;overflow:visible!important;`;

  const sourceObjects=[...source.querySelectorAll(':scope > .obj')];
  const cloneObjects=[...clone.querySelectorAll(':scope > .obj')];
  cloneObjects.forEach((el,i)=>{
    const src=sourceObjects[i];if(!src)return;
    const left=parseFloat(src.style.left)||src.offsetLeft||0,top=parseFloat(src.style.top)||src.offsetTop||0;
    const transform=src.style.transform||getComputedStyle(src).transform;
    el.style.left=(left*scale)+'px';el.style.top=(top*scale)+'px';
    el.style.transform=scaledTransform667(transform,scale);el.style.transformOrigin='top left';
  });
  frame.appendChild(clone);root.append(heading,frame);document.body.appendChild(root);
  document.body.classList.add('printClassroomOnly661');
  root.dataset.orientation=chosen;root.dataset.scale=scale.toFixed(4);root.dataset.original=`${size.width}x${size.height}`;
  return root;
}
function confirmClassroomPrint667(){
  const orientation=document.querySelector('input[name="printOrientation667"]:checked')?.value||'auto';
  const fit=document.querySelector('input[name="printFit667"]:checked')?.value||'fill';
  printChoice667={orientation,fit};$('printSettings667')?.close?.();
  const root=buildClassroomPrint667(orientation,fit);
  if(!root)return toast('Klassrummet kunde inte förberedas för utskrift.');
  requestAnimationFrame(()=>requestAnimationFrame(()=>window.print()));
}
