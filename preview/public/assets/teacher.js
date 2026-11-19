(() => {
  const $ = id => document.getElementById(id);
  const date = new Intl.DateTimeFormat('zh-HK', {
    timeZone: 'Asia/Hong_Kong', dateStyle: 'medium', timeStyle: 'short',
  });
  const titles = {
    fill: '英文定義填充', robot: '機械人／自動化系統分類', match: '用途配對',
    d1: '影片討論 Q1', d2: '影片討論 Q2', ipo: '輸入／處理／輸出', log: '學習日誌',
    trials: '真車試驗記錄', real: '老師驗收', link: 'MakeCode 分享連結',
    surf: '巡線感應器', speed: '提速記錄', sym: '流程圖符號辨認',
    flow: '巡線程式流程圖', log20: '8 字線測試記錄',
  };
  let data;
  let selected = '';
  const recordsFor = () => new Map(data.records.map(row => [row.student + ':' + row.lesson, row]));

  function add(parent, tag, value, className) {
    const element = document.createElement(tag);
    if (value !== undefined) element.textContent = value;
    if (className) element.className = className;
    parent.append(element);
    return element;
  }

  async function request(path, body) {
    const options = { signal: AbortSignal.timeout(12000) };
    if (body !== undefined) Object.assign(options, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    });
    const response = await fetch('/api/' + path, options);
    const result = await response.json();
    if (!response.ok) throw Object.assign(new Error(result.error), { status: response.status });
    return result;
  }

  function showRecord(student, lesson, record) {
    const content = $('detail-content');
    content.replaceChildren();
    add(content, 'h2', student.name + ' · ' + lesson.title);
    add(content, 'p', '成績 ' + record.total + ' / ' + record.max + ' 分');
    add(content, 'p', '收件時間 ' + date.format(record.submitted));
    add(content, 'p', '紀錄編號 ' + record.receipt);
    if (record.sample) add(content, 'p', '預載示範紀錄。');
    if (record.members?.length === 2) {
      const names = record.members.map(id => data.roster.find(entry => entry.id === id).name);
      add(content, 'p', '組員 ' + names.join('、'));
    }
    if (record.items.length) {
      const list = add(content, 'ul');
      for (const item of record.items) add(list, 'li', titles[item.key] + (item.max ? ' · ' + Math.round(item.score * 10) / 10 + ' / ' + item.max : ' · 已完成'));
    }
    if (record.makeCode) {
      const link = add(content, 'a', '開啟 MakeCode 專案');
      link.href = record.makeCode;
      link.target = '_blank';
      link.rel = 'noopener';
    }
    $('record-detail').showModal();
  }

  function render() {
    const columns = data.lessons.filter(lesson => !selected || lesson.id === selected);
    const lookup = recordsFor();
    const visibleRecords = data.records.filter(row => !selected || row.lesson === selected);
    const filters = $('filters');
    filters.replaceChildren();
    for (const [id, label] of [['', '四堂總覽'], ...data.lessons.map((lesson, i) => [lesson.id, '第' + '一二三四'[i] + '堂'])]) {
      const button = add(filters, 'button', label, 'action secondary');
      button.type = 'button';
      button.setAttribute('aria-pressed', id === selected);
      button.onclick = () => {
        selected = id;
        render();
        filters.querySelector('[aria-pressed=true]')?.focus();
      };
    }
    const stats = $('stats');
    stats.replaceChildren();
    const expected = columns.length * data.roster.length;
    for (const [label, number] of [['已繳交', visibleRecords.length], ['欠交', expected - visibleRecords.length], ['應交人次', expected]]) {
      const stat = add(stats, 'div', label, 'stat');
      add(stat, 'b', number);
    }
    const head = $('table-head');
    const body = $('table-body');
    head.replaceChildren();
    body.replaceChildren();
    const headings = add(head, 'tr');
    for (const label of ['學號', '姓名', ...columns.map(lesson => lesson.title), ...(selected ? ['收件時間'] : [])]) {
      add(headings, 'th', label).scope = 'col';
    }
    for (const student of data.roster) {
      const tr = add(body, 'tr');
      add(tr, 'td', student.num);
      add(tr, 'th', student.name).scope = 'row';
      for (const lesson of columns) {
        const cell = add(tr, 'td');
        const row = lookup.get(student.id + ':' + lesson.id);
        if (row) {
          const button = add(cell, 'button', row.total + ' / ' + row.max, 'cell-score');
          button.type = 'button';
          button.setAttribute('aria-label', student.name + '，' + lesson.title + '，已交 ' + row.total + ' 分，查看紀錄');
          button.onclick = () => showRecord(student, lesson, row);
        } else add(cell, 'span', '欠交', 'cell-missing');
        if (selected) add(tr, 'td', row ? date.format(row.submitted) : '—');
      }
    }
  }

  function resetView() {
    data = undefined;
    $('table-body').replaceChildren();
    $('dashboard').hidden = true;
    $('login').hidden = false;
    $('password').value = '';
    if ($('record-detail').open) $('record-detail').close();
  }

  async function load() {
    try {
      data = await request('records');
      $('dashboard-status').textContent = '';
      render();
      $('login').hidden = true;
      $('dashboard').hidden = false;
    } catch (error) {
      if (error.status === 401) resetView();
      else ($('dashboard').hidden ? $('login-status') : $('dashboard-status')).textContent = '未能讀取紀錄，請稍後重試。';
    }
  }

  $('login').onsubmit = async event => {
    event.preventDefault();
    $('login-status').textContent = '';
    const btn = $('login').querySelector('button');
    btn.disabled = true;
    try {
      await request('login', { password: $('password').value });
      await load();
    } catch (error) {
      $('login-status').textContent = error.status === 401 ? error.message : '暫時連不到試用伺服器。';
    } finally { btn.disabled = false; }
  };
  $('reload').onclick = load;
  $('logout').onclick = async () => {
    try {
      await request('logout', {});
      resetView();
      $('password').focus();
    } catch { $('dashboard-status').textContent = '未能登出，請稍後重試。'; }
  };
  $('download').onclick = () => {
    const lookup = recordsFor();
    const rows = [['班別', '學號', '姓名', ...data.lessons.map(lesson => lesson.title)]];
    for (const student of data.roster) rows.push([student.cls, student.num, student.name,
      ...data.lessons.map(lesson => {
        const row = lookup.get(student.id + ':' + lesson.id);
        return row ? row.total + ' / ' + row.max : '欠交';
      })]);
    const text = rows.map(row => row.map(value => '"' + String(value).replace(/"/g, '""') + '"').join(',')).join('\r\n');
    const url = URL.createObjectURL(new Blob(['\uFEFF', text], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'F1-DT-四堂成績-試用.csv';
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  };
  load();
})();
