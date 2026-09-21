/**
 * main.js - 公共功能模块
 * 负责：动态渲染 Header/Footer、购物车角标、Toast 通知、移动端导航、轮播
 * 所有 7 个页面都引入本文件，确保统一的页头页脚
 * 使用 ES6+ 特性：箭头函数、模板字面量、let/const、解构赋值、默认参数
 */
/**
 * 当前页面文件名（用于导航高亮，ES6 解构赋值）
 * 从 location.pathname 提取，默认 index.html
 */
const getCurrentPage = () => {
  // #6 适配 GitHub Pages 子路径：从 pathname 末段提取文件名
  // 例如 /my-new-site/products.html → 'products.html'
  //      /my-new-site/            → 'index.html'
  const path = window.location.pathname || '/';
  const seg = path.split('/').pop() || '';
  return seg === '' ? 'index.html' : seg;
};
/**
 * 渲染统一 Header（ES6 模板字面量生成 HTML）
 * 包含：Logo(120×60) + 导航菜单 + 购物车图标+数量角标
 */
const renderHeader = () => {
  const current = getCurrentPage();
  // 导航菜单项数组（ES6 const 数组）
  const navItems = [
    { href: 'index.html', label: 'Home', icon: 'fa-house' },
    { href: 'products.html', label: 'Products', icon: 'fa-store' },
    { href: 'cart.html', label: 'Cart', icon: 'fa-cart-shopping' },
    { href: 'admin.html', label: 'Admin', icon: 'fa-screwdriver-wrench' },
    { href: 'about.html', label: 'About', icon: 'fa-circle-info' },
    { href: 'support.html', label: 'Support', icon: 'fa-headset' },
    { href: 'feedback.html', label: 'Feedback', icon: 'fa-comment-dots' }
  ];
  // ES6: map 遍历 + 模板字面量生成导航项，当前页高亮
  const navHtml = navItems
    .map(
      (item) => `
      <a href="${item.href}" class="nav-link ${current === item.href ? 'active' : ''}">
        <i class="fa-solid ${item.icon}"></i>
        <span>${item.label}</span>
      </a>`
    )
    .join('');
  // 购物车数量角标
  const cartCount = window.Storage ? Storage.getCartCount() : 0;
  // ES6: 模板字面量拼装完整 Header
  const headerHtml = `
    <header class="site-header">
      <div class="header-inner">
        <a href="index.html" class="logo" aria-label="Infomedia Home">
          <div class="logo-box">
            <i class="fa-solid fa-gears"></i>
            <span class="logo-text">INFOMEDIA</span>
          </div>
        </a>
        <nav class="main-nav" id="mainNav">${navHtml}</nav>
        <div class="header-actions">
          <a href="cart.html" class="cart-icon-link" aria-label="Shopping cart">
            <i class="fa-solid fa-cart-shopping"></i>
            <span class="cart-badge" id="cartBadge">${cartCount}</span>
          </a>
          <button class="mobile-nav-toggle" id="mobileNavToggle" aria-label="Menu">
            <i class="fa-solid fa-bars"></i>
          </button>
        </div>
      </div>
    </header>`;
  // 插入到页面顶部
  const anchor = document.getElementById('header-mount');
  if (anchor) {
    anchor.innerHTML = headerHtml;
  } else {
    document.body.insertAdjacentHTML('afterbegin', headerHtml);
  }
  // 初始化移动端汉堡菜单
  initMobileNav();
};
/**
 * 渲染统一 Footer（ES6 模板字面量）
 */
const renderFooter = () => {
  const year = new Date().getFullYear();
  const footerHtml = `
    <footer class="site-footer">
      <div class="footer-inner">
        <div class="footer-col footer-brand">
          <div class="logo-box logo-box-light">
            <i class="fa-solid fa-gears"></i>
            <span class="logo-text">INFOMEDIA</span>
          </div>
          <p class="footer-tagline">Powering the automotive aftermarket since 1987.</p>
          <p class="footer-stock">ASX Listed · IFM</p>
        </div>
        <div class="footer-col">
          <h4>Products</h4>
          <a href="products.html">All Products</a>
          <a href="products.html?cat=parts">Parts Catalog</a>
          <a href="products.html?cat=ecommerce">Ecommerce</a>
          <a href="products.html?cat=ai">AI Assistants</a>
        </div>
        <div class="footer-col">
          <h4>Company</h4>
          <a href="about.html">About Us</a>
          <a href="support.html">Support</a>
          <a href="feedback.html">Feedback</a>
          <a href="admin.html">Admin Portal</a>
        </div>
        <div class="footer-col">
          <h4>Contact</h4>
          <p><i class="fa-solid fa-phone"></i> +61 2 9454 1500</p>
          <p><i class="fa-solid fa-location-dot"></i> Level 5, 155 Clarence Street</p>
          <p>Sydney NSW 2000, Australia</p>
          <p><i class="fa-solid fa-envelope"></i> sales@infomedia.com</p>
        </div>
      </div>
      <div class="footer-bottom">
        <p>&copy; ${year} Infomedia Ltd. All rights reserved. ABN 47 000 000 000.</p>
      </div>
    </footer>`;
  const anchor = document.getElementById('footer-mount');
  if (anchor) {
    anchor.innerHTML = footerHtml;
  } else {
    document.body.insertAdjacentHTML('beforeend', footerHtml);
  }
};
/**
 * 更新购物车数量角标（每次加购/删除后调用）
 */
const updateCartBadge = () => {
  const badge = document.getElementById('cartBadge');
  if (!badge) return;
  const count = window.Storage ? Storage.getCartCount() : 0;
  badge.textContent = count;
  // 数量大于 0 时显示角标，否则隐藏
  badge.style.display = count > 0 ? 'flex' : 'none';
};
/**
 * 初始化移动端汉堡菜单
 */
const initMobileNav = () => {
  const toggle = document.getElementById('mobileNavToggle');
  const nav = document.getElementById('mainNav');
  if (!toggle || !nav) return;
  // ES6: 箭头函数事件监听
  toggle.addEventListener('click', () => {
    nav.classList.toggle('nav-open');
    // 切换图标
    const icon = toggle.querySelector('i');
    if (nav.classList.contains('nav-open')) {
      icon.className = 'fa-solid fa-xmark';
    } else {
      icon.className = 'fa-solid fa-bars';
    }
  });
  // 点击导航链接后自动收起菜单
  nav.querySelectorAll('.nav-link').forEach((link) => {
    link.addEventListener('click', () => {
      nav.classList.remove('nav-open');
      toggle.querySelector('i').className = 'fa-solid fa-bars';
    });
  });
};
/**
 * 显示全局 Toast 通知（右上角，2 秒后自动消失）
 * @param {string} message - 提示文案
 * @param {string} type - 类型：success / error / info（ES6 默认参数）
 */
const showToast = (message, type = 'success') => {
  // 移除已存在的 Toast
  const existing = document.querySelector('.toast');
  if (existing) existing.remove();
  // 图标映射（ES6 const 对象）
  const icons = {
    success: 'fa-circle-check',
    error: 'fa-circle-exclamation',
    info: 'fa-circle-info'
  };
  // ES6: 模板字面量生成 Toast
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <i class="fa-solid ${icons[type] || icons.success}"></i>
    <span>${message}</span>
  `;
  document.body.appendChild(toast);
  // 触发进入动画
  requestAnimationFrame(() => toast.classList.add('toast-show'));
  // 2 秒后移除（ES6 箭头函数）
  setTimeout(() => {
    toast.classList.remove('toast-show');
    setTimeout(() => toast.remove(), 300);
  }, 2000);
};
/**
 * 初始化首页 Banner 轮播（自动切换）
 * 仅在存在轮播容器时执行
 */
const initBannerCarousel = () => {
  const carousel = document.getElementById('bannerCarousel');
  if (!carousel) return;
  const slides = carousel.querySelectorAll('.banner-slide');
  const dots = carousel.querySelectorAll('.banner-dot');
  if (slides.length === 0) return;
  let currentIndex = 0;
  const interval = 4000; // 切换间隔 4 秒
  /**
   * 切换到指定幻灯片
   * @param {number} index - 目标索引（ES6 默认参数）
   */
  const goToSlide = (index) => {
    slides[currentIndex].classList.remove('active');
    if (dots[currentIndex]) dots[currentIndex].classList.remove('active');
    currentIndex = (index + slides.length) % slides.length;
    slides[currentIndex].classList.add('active');
    if (dots[currentIndex]) dots[currentIndex].classList.add('active');
  };
  // 自动播放（ES6 箭头函数）
  const autoPlay = () => goToSlide(currentIndex + 1);
  let timer = setInterval(autoPlay, interval);
  // 点击指示器切换
  dots.forEach((dot, idx) => {
    dot.addEventListener('click', () => {
      goToSlide(idx);
      // 重置定时器
      clearInterval(timer);
      timer = setInterval(autoPlay, interval);
    });
  });
};
/**
 * 异步加载产品数据到 localStorage（首次访问时）
 * ES7: async/await 异步读取 products.json
 */
const ensureProductsLoaded = async () => {
  if (window.Storage && Storage.getProducts()) return Storage.getProducts();
  try {
    const response = await fetch('products.json');
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const products = await response.json();
    Storage.saveProducts(products);
    return products;
  } catch (err) {
    console.error('[main] 加载产品数据失败:', err);
    return [];
  }
};
/**
 * 页面初始化入口（ES6 箭头函数 + DOMContentLoaded）
 */
const initPage = () => {
  renderHeader();
  renderFooter();
  updateCartBadge();
  initBannerCarousel();
};
// DOM 就绪后初始化页面
document.addEventListener('DOMContentLoaded', initPage);
// 暴露公共 API
window.Main = {
  renderHeader, renderFooter, updateCartBadge, showToast,
  initBannerCarousel, ensureProductsLoaded, getCurrentPage
};
