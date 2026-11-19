(() => {
  const F1 = window.F1;
  const $ = F1.$;
  const esc = F1.esc;
  const methods = ['choice', 'match', 'fill', 'text', 'checklist', 'predict', 'trials', 'sim', 'verify', 'mclink', 'flowdrag'];
  for (const name of methods) {
    const original = F1[name];
    if (!original) continue;
    F1[name] = function (selector, options) {
      const component = original.apply(this, arguments);
      if (component) {
        component.previewElement = typeof selector === 'string' ? $(selector) : selector;
        component.previewKind = name;
        component.previewMin = options.min;
      }
      return component;
    };
  }

  let lesson;
  let signature;
  let busy = false;
  let lastReceipt;
  const originalStart = F1.start;
  F1.start = function (options) {
    lesson = options;
    originalStart(options);
    document.body.querySelector('main').insertAdjacentHTML('afterbegin', `
      <aside class="card submission-check" aria-labelledby="check-title">
        <div class="submission-head">
          <div><span class="preview-tag">本機試用版</span><h2 id="check-title">交功課前檢查</h2></div>
          <a href="/">試用版首頁</a>
        </div>
        <p id="check-summary" role="status"></p>
        <progress id="check-progress" value="0" max="1" aria-label="必做項目進度"></progress>
        <ul id="missing-items"></ul>
        <a class="btn" href="#submit">查看成績及繳交</a>
      </aside>`);
    $('#submitBtns').innerHTML = '<button type="button" class="btn primary" id="submit-online">繳交功課</button>';
    $('#submitBtns').insertAdjacentHTML('afterend', '<p class="submit-status" id="submit-status" role="status"></p>');
    $('#submit-online').addEventListener('click', send);
    document.querySelector('main').addEventListener('input', () => queueMicrotask(render));
    return F1;
  };

  function identity() {
    const stu = F1.stu;
    const num = $('#f_pnum')?.value.trim();
    const name = $('#f_pname')?.value.trim();
    return { cls: stu.cls, num: stu.num, name: stu.name, partner: (num || name) ? { num, name } : null };
  }

  function receiptKey(who) {
    const num = String(who.num || '').padStart(2, '0');
    return 'f1-preview:receipt:' + [lesson.id, who.cls, num, who.name].join(':');
  }

  function required() {
    return F1.comps;
  }

  function missing() {
    const who = identity();
    const items = [];
    if (!who.cls || !who.num || !who.name) items.push({ label: '填寫班別、學號及姓名', id: 'student' });
    if (who.partner && (!who.partner.num || !who.partner.name)) items.push({ label: '填妥組員的學號及姓名', id: 'f_pnum' });
    for (const item of required()) {
      if (item.done()) continue;
      const el = item.previewElement;
      let note = '';
      if (item.previewKind === 'text') {
        const length = ($('textarea', el)?.value || '').replace(/\s/g, '').length;
        note = ' · 還差 ' + ((item.previewMin || 1) - length) + ' 字';
      } else if (item.previewKind === 'verify') {
        note = ' · 請老師驗收';
      } else if (['fill', 'match', 'flowdrag'].includes(item.previewKind)) {
        note = ' · 作答後按「檢查答案」';
      }
      items.push({ label: item.label + note, id: el?.id || item.sec });
    }
    return items;
  }

  function render() {
    if (!lesson || !$('#check-summary')) return;
    const gaps = missing();
    const who = identity();
    const receipt = F1.get(receiptKey(who));
    const done = required().filter(item => item.done()).length;
    const total = required().length;
    const current = JSON.stringify([gaps, done, total, receipt]);
    if (current !== signature) {
      signature = current;
      $('#check-summary').textContent = receipt ? '本堂已繳交。' :
        gaps.length ? '已完成 ' + done + ' / ' + total + ' 個必做項目。點選下面的項目返回補做。' :
          '必做項目已完成，可以繳交。';
      $('#check-progress').max = total || 1;
      $('#check-progress').value = done;
      $('#missing-items').innerHTML = receipt ? '' : gaps.map(item =>
        '<li><a href="#' + esc(item.id) + '">' + esc(item.label) + '</a></li>').join('');
      $('#missing-items').querySelectorAll('a').forEach(link => link.addEventListener('click', () => {
        const card = $(link.hash)?.closest('section.card');
        card?.classList.remove('collapsed');
        const label = card && $('.sec-tools .cl', card);
        if (label) label.textContent = '摺起';
      }));
    }
    const button = $('#submit-online');
    button.disabled = busy || Boolean(receipt);
    button.textContent = receipt ? '已繳交' : busy ? '正在繳交…' : '繳交功課';
    if (receipt || lastReceipt) {
      const status = $('#submit-status');
      status.className = 'submit-status' + (receipt ? ' confirmed' : '');
      status.textContent = receipt ? '已繳交｜' + F1.fmtTime(receipt.submitted) +
        '｜成績 ' + receipt.total + ' / ' + receipt.max + '｜紀錄編號 ' + receipt.receipt : '';
    }
    lastReceipt = receipt;
  }

  async function send() {
    const gaps = missing();
    const status = $('#submit-status');
    const who = identity();
    if (busy || F1.get(receiptKey(who))) return;
    status.className = 'submit-status';
    if (gaps.length) {
      status.innerHTML = '請先補做必做項目。<a href="#check-title">查看未完成清單</a>';
      return;
    }
    busy = true;
    render();
    status.textContent = '正在等待伺服器確認…';
    try {
      F1.save(true);
      const items = required().map(item => ({ key: item.key, score: item.score(), done: item.done() }));
      const link = required().find(item => item.key === 'link');
      const response = await fetch('/api/submit', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...who, lesson: lesson.id, items, makeCode: link?.report().a }),
        signal: AbortSignal.timeout(12000),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      F1.put(receiptKey(who), result);
    } catch (error) {
      status.className = 'submit-status failed';
      status.textContent = error instanceof TypeError || error.name === 'TimeoutError' ?
        '暫時連不到伺服器。答案已留在此瀏覽器，請稍後再按繳交。' : error.message;
    } finally {
      busy = false;
      render();
    }
  }

  F1.previewRefresh = render;
})();
