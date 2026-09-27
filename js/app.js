/* ===========================================================
   甜甜小厨房 · 应用逻辑
   - 页面：首页 / 分类 / 菜品详情（多种做法视频）/ 魔法厨房（拖拽组合）/ 我的
   - 视频：点击后跳转外部视频网站免费播放（B站 / 抖音 / 西瓜 / YouTube / 小红书）
   =========================================================== */
(function () {
  'use strict';

  /* ---------- 数据准备 ---------- */
  var DISHES = (window.KITCHEN_DISHES_1 || []).concat(window.KITCHEN_DISHES_2 || []).concat(window.KITCHEN_DISHES_3 || []);
  var CATS = window.KITCHEN_CATS;
  var COMBOS = window.KITCHEN_COMBOS || [];

  var ING_RAW = window.KITCHEN_ING || [];
  var ING = (function () {
    var seen = {}, out = [];
    ING_RAW.forEach(function (i) {
      if (!seen[i.n]) { seen[i.n] = 1; out.push(i); }
    });
    return out;
  })();
  var ING_MAP = {};
  ING.forEach(function (i) { ING_MAP[i.n] = i; });

  var CAT_MAP = {};
  CATS.forEach(function (c) { CAT_MAP[c.id] = c; });

  /* ---------- 视频平台（全部免费观看，点了跳到对应网站） ---------- */
  var PLATFORMS = [
    { k: 'bili', n: '哔哩哔哩', e: '📺', u: function (q) { return 'https://search.bilibili.com/all?keyword=' + enc(q); } },
    { k: 'dy',   n: '抖音',     e: '🎵', u: function (q) { return 'https://www.douyin.com/search/' + enc(q); } },
    { k: 'xg',   n: '西瓜视频', e: '🍉', u: function (q) { return 'https://www.ixigua.com/search/' + enc(q); } },
    { k: 'yt',   n: 'YouTube',  e: '▶️', u: function (q) { return 'https://www.youtube.com/results?search_query=' + enc(q); } },
    { k: 'xhs',  n: '小红书',   e: '📕', u: function (q) { return 'https://www.xiaohongshu.com/search_result?keyword=' + enc(q); } }
  ];
  function enc(s) { return encodeURIComponent(s); }

  /* ---------- 小工具 ---------- */
  var $ = function (s, r) { return (r || document).querySelector(s); };
  function emojiCount(s) { return Array.from(String(s)).length; }
  /* 菜品「图片」：默认用 e（一个 emoji）
     art 写多个 = 一行摆开，例如 '🥠🥠🥠'
     art 用 + 分行 = 堆成一堆，例如 '🥠🥠+🥠🥠' */
  function plate(item, cls) {
    var a = (item && (item.art || item.e)) || '🍽️';
    if (a.indexOf('+') >= 0) {
      return '<div class="' + cls + ' pile">' + a.split('+').map(function (row) {
        return '<span>' + row + '</span>';
      }).join('') + '</div>';
    }
    var n = emojiCount(a);
    if (n <= 1) return '<div class="' + cls + '">' + a + '</div>';
    var base = cls.indexOf('hero-plate') >= 0 ? 76 : cls.indexOf('result-art') >= 0 ? 84 : 56;
    return '<div class="' + cls + ' multi" style="font-size:' + Math.max(11, Math.floor(base / n)) + 'px">' + a + '</div>';
  }
  function el(tag, cls, html) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html != null) e.innerHTML = html;
    return e;
  }
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function escQ(s) { return esc(s).replace(/`/g, '&#96;'); }
  function byId(id) {
    for (var i = 0; i < DISHES.length; i++) if (DISHES[i].id === id) return DISHES[i];
    return null;
  }
  function dishIng(d) { return (d.ing || []).map(function (n) { return { n: n, e: (ING_MAP[n] || {}).e || '🍽️' }; }); }
  function lvClass(lv) { return lv === '简单' ? 'g' : lv === '中等' ? 'm' : 'v'; }
  function stars(n) {
    var i, s = '';
    for (i = 0; i < 3; i++) s += i < n ? '★' : '☆';
    return s;
  }

  /* ---------- 存储 ---------- */
  var store = {
    get: function (k, d) {
      try { var v = localStorage.getItem('kk_' + k); return v == null ? d : JSON.parse(v); }
      catch (e) { return d; }
    },
    set: function (k, v) {
      try { localStorage.setItem('kk_' + k, JSON.stringify(v)); } catch (e) {}
    }
  };
  var FAVS = store.get('favs', []);
  var COOKED = store.get('cooked', []);   // 做过/看过视频的菜
  var CREATED = store.get('created', []); // 魔法厨房创作记录

  function isFav(id) { return FAVS.indexOf(id) >= 0; }
  function toggleFav(id) {
    var i = FAVS.indexOf(id);
    if (i >= 0) { FAVS.splice(i, 1); toast('已从收藏里拿走啦 🥺'); }
    else { FAVS.push(id); toast('收进我的小本本啦 💕'); burst(); }
    store.set('favs', FAVS);
  }
  function markCooked(id) {
    if (COOKED.indexOf(id) < 0) { COOKED.push(id); store.set('cooked', COOKED); }
  }

  /* ---------- 提示 / 特效 ---------- */
  var toastTimer = null;
  function toast(msg) {
    var old = $('.toast'); if (old) old.remove();
    var t = el('div', 'toast', esc(msg));
    document.body.appendChild(t);
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.remove(); }, 1900);
  }
  var EMOJIS = ['💕', '✨', '🎀', '🌟', '🍬', '🧁', '💖', '🫧', '🍓', '⭐️', '🌸', '🍭'];
  function burst(n) {
    var box = el('div', 'confetti');
    for (var i = 0; i < (n || 16); i++) {
      var s = el('span', null, EMOJIS[Math.floor(Math.random() * EMOJIS.length)]);
      s.style.left = Math.random() * 100 + '%';
      s.style.animationDuration = (1.5 + Math.random() * 1.1) + 's';
      s.style.animationDelay = (Math.random() * .5) + 's';
      s.style.fontSize = (16 + Math.random() * 14) + 'px';
      box.appendChild(s);
    }
    document.body.appendChild(box);
    setTimeout(function () { box.remove(); }, 3200);
  }

  /* ---------- 搜索状态 ---------- */
  var state = { q: '', cat: 'all', view: 'all', offset: 0 };

  function matchQuery(d, q) {
    if (!q) return true;
    q = q.toLowerCase();
    var hay = (d.n + ' ' + d.d + ' ' + (d.tags || []).join(' ') + ' ' + (d.ing || []).join(' ') + ' ' + CAT_MAP[d.c].n).toLowerCase();
    return hay.indexOf(q) >= 0;
  }
  function relevance(d, q) {
    if (!q) return 0;
    var s = 0;
    if (d.n.toLowerCase().indexOf(q) >= 0) s += 100;
    if ((d.tags || []).join(' ').toLowerCase().indexOf(q) >= 0) s += 30;
    if ((d.ing || []).join(' ').toLowerCase().indexOf(q) >= 0) s += 10;
    if (d.d.toLowerCase().indexOf(q) >= 0) s += 5;
    if (d.e.indexOf(q) >= 0) s += 3;
    return s;
  }
  function filtered() {
    var list = DISHES.filter(function (d) {
      return (state.cat === 'all' || d.c === state.cat) && matchQuery(d, state.q);
    });
    if (state.q) {
      list.sort(function (a, b) { return relevance(b, state.q) - relevance(a, state.q) || b.likes - a.likes; });
    }
    return list;
  }

  /* ---------- 搜索高亮 ---------- */
  function hi(text) {
    if (!state.q) return esc(text);
    var t = esc(text), q = esc(state.q);
    try {
      var re = new RegExp('(' + q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'ig');
      return t.replace(re, '<b style="color:#f4549a">$1</b>');
    } catch (e) { return t; }
  }

  /* ===========================================================
     组件
     =========================================================== */

  /* 菜品卡片 */
  function card(d, i) {
    var c = CAT_MAP[d.c];
    var c1 = d.bg ? d.bg[0] : c.bg[0], c2 = d.bg ? d.bg[1] : c.bg[1];
    var html =
      '<div class="card-art" style="background:linear-gradient(135deg,' + c1 + ',' + c2 + ')">' +
        '<span class="card-badge">' + c.e + ' ' + esc(c.n) + '</span>' +
        '<button class="card-fav" data-fav="' + d.id + '">' + (isFav(d.id) ? '💖' : '🤍') + '</button>' +
        '<span class="spark sp1">✨</span><span class="spark sp2">🌟</span><span class="spark sp3">💫</span>' +
        plate(d, 'plate') +
      '</div>' +
      '<div class="card-body">' +
        '<div class="card-name">' + hi(d.n) + '</div>' +
        '<div class="card-desc">' + hi(d.d) + '</div>' +
        '<div class="card-meta">' +
          '<span class="mini">⏱ ' + d.t + '分钟</span>' +
          '<span class="mini ' + lvClass(d.lv) + '">' + esc(d.lv) + '</span>' +
          '<span class="mini">' + d.kcal + 'kcal</span>' +
        '</div>' +
        '<div class="card-play">▶️ ' + (d.ms ? d.ms.length : 0) + ' 种做法 · 点我看教学</div>' +
      '</div>';
    var b = el('button', 'card', html);
    b.style.animationDelay = (i % 8) * 40 + 'ms';
    b.dataset.id = d.id;
    return b;
  }

  /* 多种做法（视频）卡片 */
  function methodBlock(m, idx) {
    var links = '';
    /* 指定了自己的视频链接：第一个按钮直接跳过去 */
    if (m.url) {
      links += '<a class="vid direct" href="' + escQ(m.url) + '" target="_blank" rel="noopener" data-q="' + escQ(m.n + ' · 指定视频') + '">▶️ 直接看这个视频</a>';
    }
    PLATFORMS.forEach(function (p) {
      var url = p.u(m.q);
      links += '<a class="vid ' + p.k + '" href="' + escQ(url) + '" target="_blank" rel="noopener" data-q="' + escQ(m.n + ' · ' + m.q) + '">' + p.e + ' ' + esc(p.n) + '搜同款</a>';
    });
    var firstUrl = m.url || PLATFORMS[0].u(m.q);
    var play = '<a class="play-btn" href="' + escQ(firstUrl) + '" target="_blank" rel="noopener" data-q="' + escQ(m.n + ' · ' + (m.url ? '指定视频' : m.q)) + '">▶</a>';
    return '' +
      '<div class="method" style="animation:pop .4s ' + (idx * 60) + 'ms both">' +
        '<div class="method-top">' + play +
          '<div style="flex:1">' +
            '<div class="method-name">' + (idx + 1) + '. ' + escQ(m.n) + '</div>' +
            '<div class="method-desc">' + escQ(m.d) + '</div>' +
          '</div>' +
        '</div>' +
        '<div class="vid-links">' + links + '</div>' +
        (m.bv ? '<div class="player-wrap"><iframe src="https://player.bilibili.com/player.html?bvid=' + escQ(m.bv) + '&page=1&autoplay=0" allowfullscreen scrolling="no"></iframe></div>' : '') +
        '<div class="vid-note">👆 点任意平台会跳转过去，在那个网站直接免费播放教学视频</div>' +
      '</div>';
  }

  /* ===========================================================
     页面
     =========================================================== */

  /* ---------- 首页 ---------- */
  function pageHome() {
    var p = el('div', 'page');

    /* 轮播 */
    var slides = [
      { e: '🍳', t: '今天学个新菜\n好啦～', d: '70+ 道菜 · 200+ 种做法视频', tags: ['新手友好', '点菜看视频'], g: ['#FFB98F', '#FF8A5B'] },
      { e: '🧪', t: '拖一拖食材\n变出一道菜', d: '魔法厨房 · 组合出你的原创菜', tags: ['自由组合', '创意无限'], g: ['#B79CF0', '#8E6BE0'] },
      { e: '🍰', t: '今天想吃甜\n小的吗？', d: '甜品饮品区 · 零失败配方', tags: ['零失败', '下午茶'], g: ['#FFA8C8', '#F06A9A'] }
    ];
    var car = el('div', 'carousel',
      '<div class="car-track">' + slides.map(function (s) {
        return '<div class="slide" style="background:linear-gradient(135deg,' + s.g[0] + ',' + s.g[1] + ')">' +
          '<div class="slide-txt"><h3>' + esc(s.t) + '</h3><p>' + esc(s.d) + '</p>' +
          '<div class="slide-tags">' + s.tags.map(function (x) { return '<span>#' + esc(x) + '</span>'; }).join('') + '</div></div>' +
          '<div class="slide-emoji">' + s.e + '</div></div>';
      }).join('') + '</div><div class="dots"><i class="on"></i><i></i><i></i></div>');
    p.appendChild(car);

    /* 两个入口 */
    p.appendChild(el('div', 'duo',
      '<button class="duo-card" data-go="list" style="background:linear-gradient(135deg,#FFA45B,#FF7E4F)">' +
        '<div class="e">🔥</div><h4>人气榜单</h4><p>大家都在做</p><div class="c">🏆</div></button>' +
      '<button class="duo-card" data-go="kitchen" style="background:linear-gradient(135deg,#9B8CF0,#6F5BD6)">' +
        '<div class="e">🧪</div><h4>魔法厨房</h4><p>拖食材组一道菜</p><div class="c">🪄</div></button>'));

    /* 分类 chip */
    p.appendChild(el('div', 'sec', '<div class="sec-head"><div class="sec-title"><i class="dot"></i>菜系分类</div><div class="sec-more">共 ' + DISHES.length + ' 道</div></div>'));
    p.appendChild(el('div', 'chips', CATS.map(function (c) {
      return '<button class="chip' + (state.cat === c.id ? ' on' : '') + '" data-cat="' + c.id + '"><span class="e">' + c.e + '</span>' + esc(c.n) + '</button>';
    }).join('')));

    /* 推荐 */
    var all = filtered();
    var recs = state.q ? all.slice(0, 20) : all.slice(state.offset % Math.max(all.length, 1), state.offset % Math.max(all.length, 1) + 8);
    if (recs.length < 8 && !state.q) recs = recs.concat(all.slice(0, 8 - recs.length));
    p.appendChild(el('div', 'sec',
      '<div class="sec-head"><div class="sec-title"><i class="dot"></i>' + (state.q ? '搜索结果' : '今日推荐') + '</div>' +
      (state.q ? '<div class="sec-more">' + recs.length + ' 道</div>'
               : '<button class="sec-more" data-shuffle="1">🎲 换一批</button>') + '</div>'));
    var g = el('div', 'grid');
    if (!recs.length) g.appendChild(el('div', '', emptyBox('🥲', '没有找到这道菜\n换个词试试看～')));
    recs.forEach(function (d, i) { g.appendChild(card(d, i)); });
    p.appendChild(g);

    bindCarousel(car);
    return p;
  }

  function emptyBox(e, t) {
    return '<div class="empty" style="grid-column:1/-1"><span class="e">' + e + '</span><p>' + esc(t).replace(/\n/g, '<br>') + '</p></div>';
  }

  function bindCarousel(car) {
    var track = $('.car-track', car), dots = $('.dots', car);
    if (!track) return;
    var idxs = Array.prototype.slice.call(track.children);
    var timer = setInterval(function () {
      var i = (idxs.indexOf(track.children[Math.round(track.scrollLeft / track.clientWidth)]) + 1) % idxs.length;
      track.scrollTo({ left: i * track.clientWidth, behavior: 'smooth' });
    }, 3600);
    track.addEventListener('scroll', function () {
      var i = Math.round(track.scrollLeft / track.clientWidth);
      Array.prototype.forEach.call(dots.children, function (d, j) { d.className = j === i ? 'on' : ''; });
    });
  }

  /* ---------- 分类列表页 ---------- */
  function pageList() {
    var cat = CAT_MAP[state.cat] || CAT_MAP.all;
    var list = filtered().sort(function (a, b) { return b.likes - a.likes; });
    var p = el('div', 'page');
    p.appendChild(el('div', 'sec',
      '<div class="sec-head"><div class="sec-title"><i class="dot"></i>' + cat.e + ' ' + esc(cat.n) + '榜单</div>' +
      '<div class="sec-more">' + list.length + ' 道</div></div>'));
    p.appendChild(el('div', 'chips', CATS.map(function (c) {
      return '<button class="chip' + (state.cat === c.id ? ' on' : '') + '" data-cat="' + c.id + '"><span class="e">' + c.e + '</span>' + esc(c.n) + '</button>';
    }).join('')));
    var g = el('div', 'grid');
    if (!list.length) g.appendChild(el('div', '', emptyBox('🥲', '这里还空空的')));
    list.forEach(function (d, i) { g.appendChild(card(d, i)); });
    p.appendChild(g);
    return p;
  }

  /* ---------- 菜品详情页 ---------- */
  function pageDetail(id) {
    var d = byId(id);
    if (!d) return pageHome();
    var c = CAT_MAP[d.c];
    var c1 = d.bg ? d.bg[0] : c.bg[0], c2 = d.bg ? d.bg[1] : c.bg[1];

    var p = el('div', 'page');
    var hero = el('div', 'hero',
      '<button class="back-btn" data-back="1">‹</button>' +
      '<div class="hero-art">' +
        plate(d, 'hero-plate') +
        '<div style="flex:1">' +
          '<h1>' + d.e + ' ' + esc(d.n) + '</h1>' +
          '<div class="sub">' + esc(d.d) + '</div>' +
          '<div class="hero-stats" style="margin-top:10px">' +
            '<div class="stat"><b>' + d.t + '分</b><span>⏱ 耗时</span></div>' +
            '<div class="stat"><b>' + esc(d.lv) + '</b><span>难度</span></div>' +
            '<div class="stat"><b>' + d.kcal + '</b><span>千卡/份</span></div>' +
            '<div class="stat"><b>' + stars(d.lv === '简单' ? 1 : d.lv === '中等' ? 2 : 3) + '</b><span>好评 ' + (d.likes / 1000).toFixed(1) + 'k</span></div>' +
          '</div>' +
        '</div>' +
      '</div>');
    hero.style.background = 'linear-gradient(135deg,' + c1 + ',' + c2 + ')';
    p.appendChild(hero);

    /* 食材 */
    p.appendChild(el('div', 'panel',
      '<h3><span class="e">🧺</span>需要准备</h3>' +
      '<div class="ing-list">' + dishIng(d).map(function (i) {
        return '<span class="ing-pill">' + i.e + ' ' + esc(i.n) + '</span>';
      }).join('') + '</div>'));

    /* 步骤 */
    p.appendChild(el('div', 'panel',
      '<h3><span class="e">👩‍🍳</span>跟着做（' + d.steps.length + ' 步）</h3>' +
      '<div class="steps">' + d.steps.map(function (s, i) {
        return '<div class="step"><div class="step-no">' + (i + 1) + '</div><div class="step-tx">' + esc(s) + '</div></div>';
      }).join('') + '</div>' +
      (d.tips ? '<div class="tip-box">💡 小贴士：' + esc(d.tips) + '</div>' : '')));

    /* 多种做法视频 */
    var ms = d.ms || [];
    p.appendChild(el('div', 'panel',
      '<h3><span class="e">🎬</span>这菜有 ' + ms.length + ' 种做法，看视频学</h3>' +
      '<div class="vid-note" style="margin:-6px 0 12px">共 ' + ms.length + ' 种做法 · ' + (ms.length * PLATFORMS.length) + ' 个免费视频入口，点一下就跳到对应网站播放 📺</div>' +
      '<div class="methods">' + ms.map(methodBlock).join('') + '</div>'));

    /* 底部操作 */
    p.appendChild(el('div', 'sec', '<div style="height:8px"></div>'));
    p.appendChild(el('div', 'panel',
      '<div style="display:flex;gap:10px">' +
        '<button class="duo-card" style="flex:1;background:linear-gradient(135deg,#FF8AB8,#F4549A);text-align:center" data-fav="' + d.id + '">' +
          (isFav(d.id) ? '💖 已收藏' : '🤍 收进小本本') + '</button>' +
        '<button class="duo-card" style="flex:1;background:linear-gradient(135deg,#7FD6A6,#2FA97A);text-align:center" data-cook="' + d.id + '">' +
          '🧪 用魔法厨房做</button>' +
      '</div>' +
      '<div class="vid-note" style="text-align:center;margin-top:10px">作者：' + d.ae + ' ' + esc(d.au) + ' · 视频均来自第三方网站免费观看</div>'));

    p.appendChild(el('div', '', '<div style="height:12px"></div>'));
    return p;
  }

  /* ---------- 魔法厨房 ---------- */
  var pot = [];   // 选中的食材名
  var ingCat = 'all';
  var ingKw = '';

  function pageKitchen() {
    var p = el('div', 'page');
    p.appendChild(el('div', 'kitchen-hero',
      '<div class="deco-e">🪄</div>' +
      '<h2>魔法厨房 · 食材大变身</h2>' +
      '<p>把下面的食材 <b>拖进锅框</b>（点一下也可以），凑一凑就能变出一道菜，还能看做法视频～</p>'));

    /* 锅 */
    var area = el('div', 'pot-area');
    area.appendChild(el('div', 'pot' + (pot.length ? ' ready' : ''),
      '<div class="pot-steam">♨️</div>' +
      '<div id="potSlots" class="pot-slots"></div>' +
      '<div id="potEmpty" class="pot-empty"' + (pot.length ? ' style="display:none"' : '') + '>' +
        '<span class="big">🍲</span>空空如也～<br>拖食材进来吧！</div>'));
    area.appendChild(el('div', 'pot-guess', '<span id="potGuess"></span>'));
    area.appendChild(el('div', '', '<button class="fire-btn" id="fireBtn" disabled>🔥 开始烹饪</button>'));
    area.appendChild(el('div', 'hint', '小提示：<b>番茄 + 鸡蛋 + 小葱</b> = 番茄炒蛋 · 最多放 6 样'));
    p.appendChild(area);

    /* 食材分类 */
    p.appendChild(el('div', 'sec', '<div class="sec-head"><div class="sec-title"><i class="dot"></i>🧺 食材抽屉</div><div class="sec-more" id="ingCount"></div></div>'));
    p.appendChild(el('div', 'chips', (window.KITCHEN_ING_CATS || []).map(function (c) {
      return '<button class="chip' + (ingCat === c.id ? ' on' : '') + '" data-ingcat="' + c.id + '"><span class="e">' + c.e + '</span>' + esc(c.n) + '</button>';
    }).join('')));
    p.appendChild(el('div', 'tray', '<div class="tray-grid" id="trayGrid"></div>'));

    /* 组合菜谱速查 */
    p.appendChild(el('div', 'sec',
      '<div class="sec-head"><div class="sec-title"><i class="dot"></i>🍳 会变的菜（' + COMBOS.length + ' 种）</div></div>'));
    var cg = el('div', 'grid');
    COMBOS.slice(0, 8).forEach(function (cb, i) { cg.appendChild(comboCard(cb, i)); });
    p.appendChild(cg);
    p.appendChild(el('div', 'sec',
      '<button class="duo-card" data-combos="1" style="width:100%;background:linear-gradient(135deg,#FFA8C8,#F06A9A)">' +
        '<div class="e">📖</div><h4>查看全部 ' + COMBOS.length + ' 种组合菜谱</h4><p>点开看食材配方和做法视频</p><div class="c">✨</div></button>'));
    p.appendChild(el('div', '', '<div style="height:14px"></div>'));

    setTimeout(function () { renderTray(); renderPot(); }, 0);
    return p;
  }

  function comboCard(cb, i) {
    var html =
      '<div class="card-art" style="background:linear-gradient(135deg,' + cb.bg[0] + ',' + cb.bg[1] + ')">' +
        '<span class="card-badge">🧪 组合</span>' +
        '<span class="spark sp1">✨</span><span class="spark sp2">🌟</span>' +
        plate(cb, 'plate') +
      '</div>' +
      '<div class="card-body">' +
        '<div class="card-name">' + esc(cb.n) + '</div>' +
        '<div class="card-desc">' + esc(cb.d) + '</div>' +
        '<div class="ing-list" style="margin-top:8px">' + cb.ings.slice(0, 4).map(function (n) {
          return '<span class="ing-pill" style="font-size:10.5px;padding:3px 8px">' + ((ING_MAP[n] || {}).e || '🍽️') + ' ' + esc(n) + '</span>';
        }).join('') + (cb.ings.length > 4 ? '<span class="ing-pill" style="font-size:10.5px;padding:3px 8px">+' + (cb.ings.length - 4) + '</span>' : '') + '</div>' +
      '</div>';
    var b = el('button', 'card', html);
    b.style.animationDelay = (i % 8) * 40 + 'ms';
    b.dataset.combo = cb.n;
    return b;
  }

  function renderTray() {
    var grid = $('#trayGrid'); if (!grid) return;
    var list = ING.filter(function (i) {
      var okc = ingCat === 'all' || i.c === ingCat;
      var okk = !ingKw || i.n.indexOf(ingKw) >= 0;
      return okc && okk;
    });
    grid.innerHTML = list.map(function (i) {
      return '<div class="ing-chip' + (pot.indexOf(i.n) >= 0 ? ' picked' : '') + '" data-ing="' + esc(i.n) + '">' +
        '<span class="e">' + i.e + '</span><span class="n">' + esc(i.n) + '</span></div>';
    }).join('');
    var cnt = $('#ingCount'); if (cnt) cnt.textContent = list.length + ' 种';
  }

  function renderPot() {
    var slots = $('#potSlots'); if (!slots) return;
    var potEl = $('.pot');
    slots.innerHTML = pot.map(function (n) {
      var it = ING_MAP[n] || { e: '🍽️' };
      return '<div class="slot" data-slot="' + esc(n) + '">' + it.e +
        '<span class="nm">' + esc(n) + '</span><button class="rm" data-rm="' + esc(n) + '">✕</button></div>';
    }).join('');
    var empty = $('#potEmpty');
    if (empty) empty.style.display = pot.length ? 'none' : 'block';
    if (potEl) potEl.classList.toggle('ready', pot.length > 0);

    var guess = $('#potGuess');
    if (guess) {
      var m = matchPot();
      guess.innerHTML = pot.length
        ? '✨ 好像会变成：<span class="g-name">' + esc(m.name) + '</span>'
        : '';
    }
    var fire = $('#fireBtn');
    if (fire) fire.disabled = pot.length === 0;
    renderTray();
  }

  /* ---------- 组合匹配引擎 ---------- */
  function matchPot() {
    var sel = pot.slice();
    var i, j, best = null, bestScore = 0;

    /* 1. 完美命中：选中食材覆盖了菜谱所需（允许额外食材） */
    for (i = 0; i < COMBOS.length; i++) {
      var cb = COMBOS[i];
      var need = cb.ings, hit = 0;
      for (j = 0; j < need.length; j++) if (sel.indexOf(need[j]) >= 0) hit++;
      if (hit === need.length && sel.length <= need.length + 2 && sel.length >= 2) {
        return { type: 'perfect', name: cb.n, combo: cb, ratio: 1 };
      }
    }
    /* 2. 部分命中：取命中最多的 */
    for (i = 0; i < COMBOS.length; i++) {
      var cb2 = COMBOS[i], hit2 = 0;
      for (j = 0; j < cb2.ings.length; j++) if (sel.indexOf(cb2.ings[j]) >= 0) hit2++;
      var score2 = hit2 / cb2.ings.length;
      if (score2 > bestScore) { bestScore = score2; best = cb2; }
    }
    if (best && bestScore >= 0.5) {
      return { type: 'creative', name: best.n + '（改良版）', combo: best, ratio: bestScore };
    }
    /* 3. 神秘料理 */
    return { type: 'mystery', name: mysteryName(sel), sel: sel };
  }

  var MYSTERY_A = ['彩虹', '云朵', '月光', '蜜糖', '元气', '魔法', '暖暖', '闪闪', '甜甜', '彩虹糖'];
  var MYSTERY_B = ['能量拌菜', '元气炒饭', '暖暖小汤', '魔法烩菜', '甜甜沙拉', '闪闪炒面', '蜜糖焗菜'];
  function mysteryName(sel) {
    if (!sel.length) return '还差食材哦';
    var h = 0;
    sel.forEach(function (n) { for (var i = 0; i < n.length; i++) h = (h * 31 + n.charCodeAt(i)) % 9999; });
    return MYSTERY_A[h % MYSTERY_A.length] + MYSTERY_B[(h >> 3) % MYSTERY_B.length];
  }

  function genericSteps(sel) {
    var main = sel.filter(function (n) {
      var c = (ING_MAP[n] || {}).c;
      return c === 'veg' || c === 'meat' || c === 'aqua' || c === 'dry' || c === 'fruit';
    });
    var m = main.length ? main[0] : sel[0];
    var mi = ING_MAP[m] || { e: '🍽️' };
    return [
      '把 ' + sel.map(function (n) { return (ING_MAP[n] || {}).e + n; }).join('、') + ' 都洗干净切好备用～',
      mi.e + ' ' + m + ' 先下锅（冷油下 ' + m + '，中火煎/炒到两面金黄）',
      '加入其他食材翻炒 2 分钟，让它们互相熟悉一下 💕',
      '加生抽 1 勺、盐少许、一点点糖提鲜',
      '大火收汁，翻炒均匀就可以装盘啦！'
    ];
  }

  function openResult() {
    var m = matchPot();
    if (!pot.length) return;
    var box = el('div', 'sheet-mask');
    var sheet = el('div', 'sheet');
    var html = '<div class="sheet-bar"></div>';

    if (m.type === 'perfect' || m.type === 'creative') {
      var cb = m.combo;
      var refDish = cb.ref ? byId(cb.ref) : null;
      var used = cb.ings.map(function (n) {
        return '<span class="used-pill">' + ((ING_MAP[n] || {}).e || '🍽️') + ' ' + esc(n) + '</span>';
      }).join('');
      var steps = cb.steps;
      html +=
        '<div class="result-top">' +
          '<span class="result-badge' + (m.type === 'creative' ? ' creative' : '') + '">' +
            (m.type === 'perfect' ? '🎉 完美复刻！' : '💡 创意改良版') + '</span>' +
          '<div class="result-art' + (emojiCount(cb.art || cb.e) > 1 ? ' multi' : '') + '">' + (cb.art || cb.e) + '</div>' +
          '<h2>' + esc(cb.n) + (m.type === 'creative' ? ' <span style="font-size:13px;color:#a1848f">改良</span>' : '') + '</h2>' +
          '<p>' + esc(cb.d) + '</p>' +
          '<div class="result-used">' + used + '</div>' +
        '</div>' +
        '<div class="panel"><h3><span class="e">👩‍🍳</span>这样做</h3><div class="steps">' +
          steps.map(function (s, i) {
            return '<div class="step"><div class="step-no">' + (i + 1) + '</div><div class="step-tx">' + esc(s) + '</div></div>';
          }).join('') + '</div></div>' +
        '<div class="panel"><h3><span class="e">🎬</span>' + cb.n + ' 的 ' + cb.ms.length + ' 种做法视频</h3>' +
          '<div class="methods">' + cb.ms.map(methodBlock).join('') + '</div></div>';
      if (refDish) {
        html += '<div class="sec"><button class="duo-card" data-open="' + refDish.id + '" style="width:100%;background:linear-gradient(135deg,#FF8AB8,#F4549A)">' +
          '<div class="e">' + refDish.e + '</div><h4>看「' + esc(refDish.n) + '」完整菜谱</h4><p>还有 ' + refDish.ms.length + ' 种做法 · 食材热量全都有</p><div class="c">📖</div></button></div>';
      }
    } else {
      html +=
        '<div class="result-top">' +
          '<span class="result-badge creative">🪄 神秘料理诞生！</span>' +
          '<div class="result-art">🧑‍🍳</div>' +
          '<h2>' + esc(m.name) + '</h2>' +
          '<p>这是你自己发明的菜！<br>小秘诀一次只放 2～4 样食材，口感才不会打架哦～</p>' +
          '<div class="result-used">' + pot.map(function (n) {
            return '<span class="used-pill">' + ((ING_MAP[n] || {}).e || '🍽️') + ' ' + esc(n) + '</span>';
          }).join('') + '</div>' +
        '</div>' +
        '<div class="panel"><h3><span class="e">👩‍🍳</span>试着这样做</h3><div class="steps">' +
          genericSteps(pot).map(function (s, i) {
            return '<div class="step"><div class="step-no">' + (i + 1) + '</div><div class="step-tx">' + esc(s) + '</div></div>';
          }).join('') + '</div></div>' +
        '<div class="panel"><h3><span class="e">🎬</span>找同款教学视频</h3><div class="methods">' +
          methodBlock({ n: pot.join(' + ') + ' 的做法', d: '按这个组合关键词去搜，看看别人怎么做的', q: pot.join(' ') + ' 做法' }, 0) +
          '</div></div>';
    }

    html += '<div class="sec" style="padding-bottom:6px"><div style="display:flex;gap:10px">' +
      '<button class="duo-card" style="flex:1;background:linear-gradient(135deg,#FFB0C8,#F4549A);text-align:center" data-again="1">🧪 再做一道</button>' +
      '<button class="duo-card" style="flex:1;background:linear-gradient(135deg,#A8DCC8,#2FA97A);text-align:center" data-close="1">✅ 收下菜谱</button>' +
    '</div></div>';

    sheet.innerHTML = html;
    box.appendChild(sheet);
    box.addEventListener('click', function (e) { if (e.target === box) close(); });
    function close() { box.remove(); }
    box.addEventListener('click', function (e) {
      var a = e.target.closest('[data-close],[data-again]');
      if (!a) return;
      if (a.dataset.again != null) { close(); clearPot(); renderPot(); }
      else {
        close();
        var rec = { n: m.name, e: m.type === 'mystery' ? '🧑‍🍳' : m.combo.e, ing: pot.slice(), t: Date.now() };
        CREATED.unshift(rec); CREATED = CREATED.slice(0, 12); store.set('created', CREATED);
        toast('菜谱已收进「我的」里啦 🍬');
      }
    });
    document.body.appendChild(box);
    burst(26);
    if (m.type === 'perfect' || m.type === 'creative') {
      var rid = m.combo.ref;
      if (rid) markCooked(rid);
    }
  }

  function clearPot() { pot = []; }

  /* ---------- 我的 ---------- */
  function pageMine() {
    var p = el('div', 'page');
    p.appendChild(el('div', 'profile',
      '<div class="avatar">🍑</div>' +
      '<h2>小甜心厨娘</h2>' +
      '<p>今天也要好好吃饭呀～ ♡</p>' +
      '<div class="p-stats">' +
        '<div class="p-stat"><b>' + FAVS.length + '</b><span>收藏菜品</span></div>' +
        '<div class="p-stat"><b>' + CREATED.length + '</b><span>创作菜品</span></div>' +
        '<div class="p-stat"><b>' + COOKED.length + '</b><span>学过的做法</span></div>' +
      '</div>'));

    var badges = [
      { e: '🍳', n: '下厨新手', on: true },
      { e: '🔥', n: '连续做饭', on: COOKED.length >= 5 },
      { e: '💖', n: '收集癖', on: FAVS.length >= 5 },
      { e: '🧪', n: '发明家', on: CREATED.length >= 1 },
      { e: '👩‍🍳', n: '大厨', on: COOKED.length >= 20 },
      { e: '🌟', n: '人气王', on: FAVS.length >= 15 },
      { e: '🍰', n: '甜品控', on: false },
      { e: '🥤', n: '饮品控', on: false }
    ];
    p.appendChild(el('div', 'panel',
      '<h3><span class="e">🏅</span>我的勋章</h3>' +
      '<div class="badges">' + badges.map(function (b) {
        return '<div class="badge-i' + (b.on ? '' : ' lock') + '"><div class="e">' + b.e + '</div><div class="n">' + esc(b.n) + '</div></div>';
      }).join('') + '</div>'));

    /* 我的创作 */
    p.appendChild(el('div', 'panel',
      '<h3><span class="e">🧪</span>我的魔法厨房作品</h3>' +
      (CREATED.length
        ? CREATED.map(function (r) {
            return '<div class="list-item"><div class="list-ico">' + r.e + '</div>' +
              '<div class="list-tx"><b>' + esc(r.n) + '</b><span>' +
                (r.ing || []).map(function (n) { return ((ING_MAP[n] || {}).e || '') + esc(n); }).join(' ') +
              '</span></div><div class="list-arrow">›</div></div>';
          }).join('')
        : '<div class="empty" style="padding:26px"><span class="e">🥄</span><p>还没创作过菜品<br>去魔法厨房拖两样食材试试～</p></div>')));

    /* 收藏 */
    p.appendChild(el('div', 'panel',
      '<h3><span class="e">💖</span>我的小本本（' + FAVS.length + '）</h3>' +
      (FAVS.length
        ? FAVS.map(function (id) {
            var d = byId(id); if (!d) return '';
            var c = CAT_MAP[d.c];
            return '<div class="list-item" data-open="' + d.id + '" style="cursor:pointer">' +
              '<div class="list-ico" style="background:linear-gradient(135deg,' + c.bg[0] + ',' + c.bg[1] + ')">' + d.e + '</div>' +
              '<div class="list-tx"><b>' + esc(d.n) + '</b><span>' + esc(c.n) + ' · ' + d.ms.length + ' 种做法</span></div>' +
              '<div class="list-arrow">›</div></div>';
          }).join('')
        : '<div class="empty" style="padding:26px"><span class="e">📖</span><p>小本本还空空的<br>点菜品卡片右上角的 🤍 收藏吧～</p></div>')));

    /* 其他 */
    p.appendChild(el('div', 'panel',
      '<h3><span class="e">⚙️</span>其他</h3>' +
      '<div class="list-item" data-info="videos"><div class="list-ico">🎬</div><div class="list-tx"><b>视频从哪来？</b><span>点一下会跳到外部网站免费看</span></div><div class="list-arrow">›</div></div>' +
      '<div class="list-item" data-info="clear"><div class="list-ico">🧹</div><div class="list-tx"><b>清空我的数据</b><span>收藏 / 创作记录全部清掉</span></div><div class="list-arrow">›</div></div>'));
    p.appendChild(el('div', '', '<div style="height:14px"></div>'));
    return p;
  }

  /* ---------- 搜索页 ---------- */
  function pageSearch() {
    var p = el('div', 'page');
    var list = filtered();
    p.appendChild(el('div', 'sec',
      '<div class="sec-head"><div class="sec-title"><i class="dot"></i>🔍 搜索「' + esc(state.q) + '」</div>' +
      '<div class="sec-more">' + list.length + ' 个结果</div></div>'));
    var g = el('div', 'grid');
    if (!list.length) g.appendChild(el('div', '', emptyBox('🔍', '没找到「' + state.q + '」\n试试「番茄」「鸡」「奶茶」～')));
    list.forEach(function (d, i) { g.appendChild(card(d, i)); });
    p.appendChild(g);
    p.appendChild(el('div', '', '<div style="height:14px"></div>'));
    return p;
  }

  /* ===========================================================
     路由
     =========================================================== */
  var TABS = [
    { id: 'home', e: '🏠', n: '首页' },
    { id: 'kitchen', e: '🧪', n: '魔法厨房' },
    { id: 'fav', e: '💖', n: '收藏' },
    { id: 'mine', e: '🍑', n: '我的' }
  ];
  var route = { name: 'home', param: null };

  function go(name, param) {
    location.hash = '#/' + name + (param ? '/' + param : '');
  }
  function clearQuery() {
    state.q = '';
    var i = $('#searchInput'); if (i) i.value = '';
  }

  function render() {
    var h = location.hash.replace(/^#\//, '');
    var parts = h.split('/');
    var name = parts[0] || 'home';
    var param = parts[1] || null;
    if (name === 'list') { route = { name: 'list', param: null }; mount(pageList()); return; }
    if (name === 'search') { route = { name: 'search', param: null }; mount(pageSearch()); return; }
    if (name === 'kitchen') { route = { name: 'kitchen', param: null }; mount(pageKitchen()); return; }
    if (name === 'fav') { route = { name: 'fav', param: null }; mount(pageFav()); return; }
    if (name === 'mine') { route = { name: 'mine', param: null }; mount(pageMine()); return; }
    if (name === 'dish') { route = { name: 'dish', param: param }; mount(pageDetail(param)); return; }
    route = { name: 'home', param: null };
    mount(pageHome());
  }

  function mount(page) {
    var main = $('#main');
    main.innerHTML = '';
    main.appendChild(page);
    main.scrollTop = 0;
    updateTabs();
    setSearchBar();
  }

  function pageFav() {
    var list = FAVS.map(byId).filter(Boolean);
    var p = el('div', 'page');
    p.appendChild(el('div', 'sec',
      '<div class="sec-head"><div class="sec-title"><i class="dot"></i>💖 我的小本本</div>' +
      '<div class="sec-more">' + list.length + ' 道</div></div>'));
    var g = el('div', 'grid');
    if (!list.length) g.appendChild(el('div', '', emptyBox('📖', '小本本还空空的～\n逛逛首页点个 🤍 收藏吧！')));
    list.forEach(function (d, i) { g.appendChild(card(d, i)); });
    p.appendChild(g);
    p.appendChild(el('div', '', '<div style="height:14px"></div>'));
    return p;
  }

  function updateTabs() {
    Array.prototype.forEach.call(document.querySelectorAll('.tab'), function (t) {
      t.classList.toggle('on', t.dataset.tab === route.name || (t.dataset.tab === 'home' && (route.name === 'list' || route.name === 'search')));
    });
  }

  /* ---------- 顶栏搜索框状态 ---------- */
  function setSearchBar() {
    var bar = $('#searchBar');
    if (!bar) return;
    if (route.name === 'search') {
      bar.style.display = 'flex';
      $('#searchInput').value = state.q;
      $('#sClear').style.display = 'block';
    } else if (route.name === 'kitchen' || route.name === 'mine' || route.name === 'fav' || route.name === 'dish') {
      bar.style.display = 'none';
    } else {
      bar.style.display = 'flex';
      $('#sClear').style.display = state.q ? 'block' : 'none';
    }
  }

  /* ===========================================================
     事件
     =========================================================== */
  function bindGlobal() {
    /* 顶栏 */
    $('#searchInput').addEventListener('input', function () {
      state.q = this.value.trim();
      $('#sClear').style.display = state.q ? 'block' : 'none';
      /* 搜索页 / 首页 / 榜单页 输入即筛选 */
      if (route.name === 'search') { mount(pageSearch()); }
      else if (state.q && (route.name === 'home' || route.name === 'list')) { go('search'); }
    });
    $('#searchInput').addEventListener('keydown', function (e) {
      if (e.key === 'Enter') {
        this.blur();
        if (state.q) { go('search'); }
        else toast('输入想吃的菜名试试～');
      }
    });
    $('#sClear').addEventListener('click', function () {
      state.q = '';
      $('#searchInput').value = '';
      this.style.display = 'none';
      if (route.name === 'search') go('home'); else render();
    });

    /* 底部导航 */
    $('#tabbar').addEventListener('click', function (e) {
      var t = e.target.closest('.tab'); if (!t) return;
      clearQuery();
      if (t.dataset.tab === 'home') { state.cat = 'all'; state.offset = 0; }
      go(t.dataset.tab);
    });

    /* 主区域代理事件 */
    $('#main').addEventListener('click', function (e) {
      var t;

      /* 收藏切换 */
      t = e.target.closest('[data-fav]');
      if (t) {
        e.stopPropagation();
        toggleFav(t.dataset.fav);
        var dishId = t.dataset.fav;
        if (route.name === 'dish') { mount(pageDetail(dishId)); }
        else if (route.name === 'fav') { mount(pageFav()); }
        else { render(); }
        return;
      }

      /* 换一批 */
      if (e.target.closest('[data-shuffle]')) {
        state.offset += 8;
        render();
        toast('换了一批新菜～ 🎲');
        return;
      }

      /* 分类切换 */
      t = e.target.closest('[data-cat]');
      if (t) {
        state.cat = t.dataset.cat;
        if (route.name === 'list') { render(); }
        else { go('list'); }
        return;
      }

      /* 打开详情 */
      t = e.target.closest('.card[data-id]');
      if (t) { go('dish', t.dataset.id); return; }

      /* 返回 */
      if (e.target.closest('[data-back]')) { history.back(); return; }

      /* 入口按钮 */
      t = e.target.closest('[data-go]');
      if (t) { clearQuery(); go(t.dataset.go); return; }

      /* 打开菜品（列表项） */
      t = e.target.closest('[data-open]');
      if (t) { go('dish', t.dataset.open); return; }

      /* 用魔法厨房做这道菜 */
      t = e.target.closest('[data-cook]');
      if (t) {
        var d = byId(t.dataset.cook);
        if (d) {
          pot = (d.ing || []).filter(function (n) { return !!ING_MAP[n]; }).slice(0, 6);
          toast('已把「' + d.n + '」的食材放进锅里啦 🪄');
          go('kitchen');
        }
        return;
      }

      /* 食材分类 */
      t = e.target.closest('[data-ingcat]');
      if (t) { ingCat = t.dataset.ingcat; render(); return; }

      /* 点击食材chip 加入锅（点按添加） */
      t = e.target.closest('.ing-chip');
      if (t) { addIng(t.dataset.ing); return; }

      /* 组合卡片 */
      t = e.target.closest('[data-combo]');
      if (t) {
        var nm = t.dataset.combo;
        COMBOS.forEach(function (cb) { if (cb.n === nm) { pot = cb.ings.slice(); renderPot(); openResult(); } });
        return;
      }

      /* 查看全部组合 */
      if (e.target.closest('[data-combos]')) { showComboBook(); return; }

      /* 我的：说明 / 清空 */
      t = e.target.closest('[data-info]');
      if (t) {
        if (t.dataset.info === 'videos') {
          toast('教学视频来自 B站 / 抖音 / 西瓜 / YouTube / 小红书，点一下就跳转过去免费播放 📺');
        } else {
          if (confirm('确定要清空收藏和创作记录吗？')) {
            FAVS = []; CREATED = []; COOKED = []; COOKED = [];
            store.set('favs', FAVS); store.set('created', CREATED); store.set('cooked', COOKED);
            toast('清空啦，重新开始吧 🍬'); render();
          }
        }
        return;
      }
    });

    /* 锅内删除 */
    $('#main').addEventListener('click', function (e) {
      var r = e.target.closest('[data-rm]');
      if (r) { e.stopPropagation(); pot = pot.filter(function (n) { return n !== r.dataset.rm; }); renderPot(); }
    }, true);

    /* 开火 */
    $('#main').addEventListener('click', function (e) {
      if (e.target.closest('#fireBtn')) openResult();
    });

    /* 视频链接点击 → 记一次「学过的做法」 */
    $('#main').addEventListener('click', function (e) {
      var v = e.target.closest('.vid[data-q]');
      if (v && route.name === 'dish' && route.param) {
        markCooked(route.param);
        toast('正在跳转到 ' + v.textContent.trim() + ' …');
      }
    });

    /* 重新开始组合 */
    document.addEventListener('click', function (e) {
      if (e.target.closest('[data-again]')) { clearPot(); if (route.name === 'kitchen') renderPot(); }
    });
  }

  /* 组合菜谱手册 */
  function showComboBook() {
    var mask = el('div', 'sheet-mask');
    var sheet = el('div', 'sheet');
    sheet.innerHTML = '<div class="sheet-bar"></div>' +
      '<div class="sec-head"><div class="sec-title"><i class="dot"></i>📖 组合菜谱手册（' + COMBOS.length + ' 种）</div></div>' +
      '<div class="list-item" style="border:none"><div class="list-tx"><span>把对应的食材拖进锅里，就能召唤出这道菜，还能看做法视频哦～</span></div></div>' +
      COMBOS.map(function (cb) {
        return '<div class="list-item" data-combo="' + esc(cb.n) + '" style="cursor:pointer">' +
          '<div class="list-ico" style="background:linear-gradient(135deg,' + cb.bg[0] + ',' + cb.bg[1] + ')">' + cb.e + '</div>' +
          '<div class="list-tx"><b>' + esc(cb.n) + '</b><span>' +
            cb.ings.map(function (n) { return ((ING_MAP[n] || {}).e || '🍽️') + esc(n); }).join(' ') +
          '</span></div><div class="list-arrow">›</div></div>';
      }).join('');
    mask.appendChild(sheet);
    mask.addEventListener('click', function (e) { if (e.target === mask) mask.remove(); });
    sheet.addEventListener('click', function (e) {
      var it = e.target.closest('[data-combo]');
      if (!it) return;
      mask.remove();
      COMBOS.forEach(function (cb) { if (cb.n === it.dataset.combo) { pot = cb.ings.slice(); renderPot(); openResult(); } });
    });
    document.body.appendChild(mask);
  }

  /* ===========================================================
     拖拽（鼠标 + 触屏）
     =========================================================== */
  function addIng(name) {
    if (pot.indexOf(name) >= 0) {
      var chip = $('.ing-chip[data-ing="' + name + '"]');
      if (chip) { chip.classList.add('wiggle'); setTimeout(function () { chip.classList.remove('wiggle'); }, 420); }
      return;
    }
    if (pot.length >= 6) { toast('锅小啦～最多放 6 样食材 🐣'); return; }
    pot.push(name);
    burst(6);
    renderPot();
  }

  function initDrag() {
    var ghost = null, src = null, moved = false, startX = 0, startY = 0, overPot = false;

    document.addEventListener('pointerdown', function (e) {
      var chip = e.target.closest('.ing-chip');
      if (!chip) return;
      src = chip; moved = false;
      startX = e.clientX; startY = e.clientY;
    });

    document.addEventListener('pointermove', function (e) {
      if (!src) return;
      var dx = e.clientX - startX, dy = e.clientY - startY;
      if (!moved && Math.sqrt(dx * dx + dy * dy) < 10) return;
      if (!moved) {
        moved = true;
        ghost = el('div', 'drag-ghost', src.innerHTML);
        document.body.appendChild(ghost);
        src.style.opacity = '.35';
      }
      e.preventDefault();
      ghost.style.left = e.clientX + 'px';
      ghost.style.top = e.clientY + 'px';
      var potEl = pot ? null : null;
      var under = document.elementFromPoint(e.clientX, e.clientY);
      var p = under && under.closest ? under.closest('.pot') : null;
      overPot = !!p;
      var pots = document.querySelectorAll('.pot');
      Array.prototype.forEach.call(pots, function (x) { x.classList.toggle('over', overPot); });
    });

    document.addEventListener('pointerup', function (e) {
      if (!src) return;
      var chip = src, wasMoved = moved;
      src = null; moved = false;
      if (ghost) { ghost.remove(); ghost = null; }
      chip.style.opacity = '';
      Array.prototype.forEach.call(document.querySelectorAll('.pot'), function (x) { x.classList.remove('over'); });
      if (!wasMoved) return; // 交给 click 处理
      var under = document.elementFromPoint(e.clientX, e.clientY);
      var p = under && under.closest ? under.closest('.pot') : null;
      if (p) {
        addIng(chip.dataset.ing);
      } else {
        chip.classList.add('wiggle');
        setTimeout(function () { chip.classList.remove('wiggle'); }, 420);
        toast('要把食材拖到锅框里哦 🐣');
      }
    });
  }

  /* ===========================================================
     启动
     =========================================================== */
  function boot() {
    var main = $('#main');
    Array.prototype.forEach.call(document.querySelectorAll('.deco'), function () {});
    var deco = el('div', 'deco-layer',
      ['💕', '🌸', '🧁', '✨', '🎀', '💫'].map(function (e) { return '<span class="deco">' + e + '</span>'; }).join(''));
    document.body.appendChild(deco);

    $('#tabbar').innerHTML = TABS.map(function (t) {
      return '<button class="tab" data-tab="' + t.id + '"><span class="e">' + t.e + '</span><span class="n">' + t.n + '</span></button>';
    }).join('');

    /* 顶栏统计（真实菜品数 / 做法数） */
    var mCount = DISHES.reduce(function (a, d) { return a + ((d.ms || []).length); }, 0);
    var tag1 = $('#statDish'), tag2 = $('#statMethod');
    if (tag1) tag1.textContent = DISHES.length + ' 道菜';
    if (tag2) tag2.textContent = '🎬 ' + mCount + ' 种做法';

    bindGlobal();
    initDrag();
    window.addEventListener('hashchange', render);
    if (!location.hash) location.hash = '#/home';
    render();
  }

  document.addEventListener('DOMContentLoaded', boot);
})();
