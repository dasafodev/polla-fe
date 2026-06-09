/* PaulPredice — landing
   Tarjeta interactiva del Grupo K: reordenar (arrastrar + flechas) y
   easter egg cuando Colombia llega al primer puesto. Sin dependencias. */
(function () {
  var list = document.getElementById('groupList');
  var vamos = document.getElementById('vamos');
  var confettiHost = document.getElementById('confetti');
  if (!list) return;

  var reduced =
    window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Colombia arranca en 2.º puesto, así que el easter egg empieza "armado".
  var colombiaWasFirst = false;
  var vamosTimer = null;

  function rows() {
    return Array.prototype.slice.call(list.children);
  }

  function syncPositions() {
    var els = rows();
    els.forEach(function (el, i) {
      el.querySelector('.gTeam__pos').textContent = i + 1;
      el.classList.toggle('is-qualify', i < 2);
      var up = el.querySelector('[data-dir="up"]');
      var down = el.querySelector('[data-dir="down"]');
      if (up) up.disabled = i === 0;
      if (down) down.disabled = i === els.length - 1;
    });
  }

  function checkEaster() {
    var first = list.firstElementChild;
    var isCol = !!first && first.getAttribute('data-id') === 'co';
    if (isCol && !colombiaWasFirst) {
      colombiaWasFirst = true;
      celebrate();
    } else if (!isCol) {
      colombiaWasFirst = false;
    }
  }

  function celebrate() {
    if (vamos) {
      vamos.classList.add('is-on');
      if (vamosTimer) clearTimeout(vamosTimer);
      vamosTimer = setTimeout(function () {
        vamos.classList.remove('is-on');
      }, 1900);
    }
    burstConfetti();
  }

  var COLORS = ['#fcd116', '#003893', '#ce1126', '#6d3bd6', '#8b6dff'];

  function burstConfetti() {
    if (reduced || !confettiHost) return;
    var count = 90;
    var pieces = [];
    for (var i = 0; i < count; i++) {
      var s = document.createElement('span');
      var w = 6 + (i % 5);
      s.style.width = w + 'px';
      s.style.height = w * 0.5 + 'px';
      s.style.background = COLORS[i % COLORS.length];
      confettiHost.appendChild(s);
      pieces.push(s);
      if (typeof s.animate !== 'function') continue;
      var angle = (i / count) * Math.PI * 2;
      var dist = 120 + (i % 7) * 28;
      var dx = Math.cos(angle) * dist;
      var dy = Math.sin(angle) * dist - 140;
      s.animate(
        [
          { transform: 'translate(-50%,-50%) rotate(0deg)', opacity: 1 },
          {
            transform: 'translate(' + dx + 'px,' + (dy + 260) + 'px) rotate(' + (360 + i * 12) + 'deg)',
            opacity: 0,
          },
        ],
        { duration: 1100 + (i % 6) * 120, easing: 'cubic-bezier(.2,.6,.2,1)', fill: 'forwards' },
      );
    }
    setTimeout(function () {
      pieces.forEach(function (p) {
        p.remove();
      });
    }, 2400);
  }

  /* ----- Flechas (con animación FLIP) ----- */
  function flip(mutate) {
    var els = rows();
    var firstTops = els.map(function (el) {
      return el.getBoundingClientRect().top;
    });
    mutate();
    rows().forEach(function (el) {
      var idx = els.indexOf(el);
      if (idx === -1) return;
      var dy = firstTops[idx] - el.getBoundingClientRect().top;
      if (!dy) return;
      el.style.transition = 'none';
      el.style.transform = 'translateY(' + dy + 'px)';
      requestAnimationFrame(function () {
        el.style.transition = 'transform .22s cubic-bezier(.2,.7,.2,1)';
        el.style.transform = '';
      });
      setTimeout(function () {
        el.style.transition = '';
      }, 240);
    });
  }

  list.addEventListener('click', function (e) {
    var btn = e.target.closest('.gTeam__arrow');
    if (!btn || btn.disabled) return;
    var row = btn.closest('.gTeam');
    var dir = btn.getAttribute('data-dir');
    if (dir === 'up' && row.previousElementSibling) {
      if (reduced) list.insertBefore(row, row.previousElementSibling);
      else flip(function () { list.insertBefore(row, row.previousElementSibling); });
    } else if (dir === 'down' && row.nextElementSibling) {
      if (reduced) list.insertBefore(row.nextElementSibling, row);
      else flip(function () { list.insertBefore(row.nextElementSibling, row); });
    } else {
      return;
    }
    syncPositions();
    checkEaster();
  });

  /* ----- Arrastrar (Pointer Events) ----- */
  var drag = null;

  function onDown(e) {
    var row = e.target.closest('.gTeam');
    if (!row || e.target.closest('.gTeam__arrow')) return;
    // En táctil solo arranca desde el agarre, para no bloquear el scroll de la página.
    var onHandle = !!e.target.closest('.gTeam__handle');
    if (e.pointerType === 'touch' && !onHandle) return;
    if (typeof e.button === 'number' && e.button !== 0) return;

    e.preventDefault();
    var rect = row.getBoundingClientRect();
    drag = { el: row, grabDy: e.clientY - rect.top, pointerId: e.pointerId };
    row.classList.add('is-dragging');
    try {
      row.setPointerCapture(e.pointerId);
    } catch (err) {}
    document.addEventListener('pointermove', onMove);
    document.addEventListener('pointerup', onUp);
    document.addEventListener('pointercancel', onUp);
  }

  function onMove(e) {
    if (!drag) return;
    var el = drag.el;

    // Punto de inserción según la posición del puntero vs. el centro de cada vecino.
    var placed = false;
    rows().forEach(function (sib) {
      if (placed || sib === el) return;
      var r = sib.getBoundingClientRect();
      if (e.clientY < r.top + r.height / 2) {
        list.insertBefore(el, sib);
        placed = true;
      }
    });
    if (!placed) list.appendChild(el);

    // Ubicar la fila arrastrada bajo el puntero (se mide DESPUÉS de reordenar).
    el.style.transform = 'none';
    var naturalTop = el.getBoundingClientRect().top;
    el.style.transform = 'translateY(' + (e.clientY - drag.grabDy - naturalTop) + 'px)';

    syncPositions();
    checkEaster();
  }

  function onUp() {
    if (!drag) return;
    var el = drag.el;
    el.style.transform = '';
    el.classList.remove('is-dragging');
    try {
      el.releasePointerCapture(drag.pointerId);
    } catch (err) {}
    document.removeEventListener('pointermove', onMove);
    document.removeEventListener('pointerup', onUp);
    document.removeEventListener('pointercancel', onUp);
    drag = null;
    syncPositions();
    checkEaster();
  }

  list.addEventListener('pointerdown', onDown);

  syncPositions();
})();
