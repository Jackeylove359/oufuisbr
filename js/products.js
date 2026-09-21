/**
 * products.js - 产品商店模块（最终修复版）
 * 修复点：
 *  #1 首页精选产品 Details 按钮单独绑定 click，stopPropagation 避免与卡片事件冲突
 *  #2 分类筛选同步 URL ?cat=xxx，使用 history.pushState 不刷新页面；popstate 监听回退
 *  #5 字段安全兜底：id/image/price/stock 缺失时不崩溃
 *  #7 Modal/Lightbox 持久化 overlay，事件只挂载一次，避免重复绑定
 */
const CATEGORY_MAP = {
  all: 'All',
  parts: 'Parts Catalog',
  ecommerce: 'Ecommerce',
  service: 'Service Management',
  analytics: 'Data Analytics',
  ai: 'AI'
};

let currentCategory = 'all';
let allProducts = [];

/* ============================================================
 * #5 安全兜底：规范化单个产品字段，避免 NaN / undefined 导致渲染崩溃
 * ============================================================ */
const normalizeProduct = (raw, fallbackId = 0) => {
  if (!raw || typeof raw !== 'object') return null;
  const id = Number(raw.id);
  const price = Number(raw.price);
  const stock = Number(raw.stock);
  return {
    id: Number.isFinite(id) ? id : fallbackId,
    name: typeof raw.name === 'string' && raw.name.trim() ? raw.name : 'Unnamed Product',
    price: Number.isFinite(price) && price > 0 ? price : 0,
    stock: Number.isFinite(stock) && stock >= 0 ? Math.floor(stock) : 0,
    category: typeof raw.category === 'string' && CATEGORY_MAP[raw.category] ? raw.category : 'all',
    image: typeof raw.image === 'string' && raw.image.trim()
      ? raw.image
      : 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=automotive%20saas%20product&image_size=square',
    description: typeof raw.description === 'string' ? raw.description : ''
  };
};

/**
 * 异步加载产品数据（#5：逐条 normalize，过滤掉完全无效的对象）
 */
const loadProductsData = async () => {
  const res = await fetch('products.json');
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const rawList = await res.json();
  allProducts = Array.isArray(rawList)
    ? rawList
        .map((item, idx) => normalizeProduct(item, idx + 1))
        .filter((p) => p !== null)
    : [];
  return allProducts;
};

/**
 * 按分类筛选产品
 */
const filterProducts = (category = 'all') => {
  if (category === 'all') return allProducts;
  return allProducts.filter((p) => p.category === category);
};

/* ============================================================
 * #2 URL 同步：读取 / 写入 ?cat=xxx
 * ============================================================ */
const readCategoryFromUrl = () => {
  const params = new URLSearchParams(window.location.search);
  const cat = params.get('cat');
  if (cat && CATEGORY_MAP[cat]) {
    currentCategory = cat;
  } else {
    currentCategory = 'all';
  }
};

const updateUrlForCategory = (category) => {
  const params = new URLSearchParams(window.location.search);
  if (category === 'all') {
    params.delete('cat');
  } else {
    params.set('cat', category);
  }
  const qs = params.toString();
  const newUrl = qs
    ? `${window.location.pathname}?${qs}`
    : window.location.pathname;
  // #2：使用 pushState 不刷新页面
  try {
    history.pushState({ cat: category }, '', newUrl);
  } catch (e) {
    // 某些环境下 pushState 可能抛错（如 file://），降级为 replaceState
    history.replaceState({ cat: category }, '', newUrl);
  }
};

/* ============================================================
 * 渲染分类按钮
 * ============================================================ */
const renderFilterBar = () => {
  const bar = document.getElementById('filterBar');
  if (!bar) return;

  bar.innerHTML = Object.entries(CATEGORY_MAP)
    .map(
      ([code, label]) => `
      <button class="filter-btn ${currentCategory === code ? 'active' : ''}"
              data-category="${code}">${label}</button>`
    )
    .join('');

  bar.querySelectorAll('.filter-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const next = btn.dataset.category;
      if (next === currentCategory) return;
      currentCategory = next;
      // #2：同步 URL ?cat=xxx
      updateUrlForCategory(next);
      renderFilterBar();
      renderProductGrid();
    });
  });
};

/* ============================================================
 * 渲染产品主列表
 * ============================================================ */
const renderProductGrid = () => {
  const grid = document.getElementById('productGrid');
  if (!grid) return;

  const products = filterProducts(currentCategory);

  if (products.length === 0) {
    grid.innerHTML = `
      <div class="empty-cart">
        <i class="fa-solid fa-box-open"></i>
        <h3>No products found</h3>
        <p>Try a different category.</p>
      </div>`;
    return;
  }

  grid.innerHTML = products
    .map((product) => {
      const { id, name, price, category, stock, image, description } = product;
      const lowStock = stock < 5;
      const stockBadge = lowStock
        ? `<span class="product-stock-badge low">Low Stock: ${stock}</span>`
        : `<span class="product-stock-badge">In Stock: ${stock}</span>`;

      return `
      <div class="product-card" data-id="${id}">
        <div class="product-image">
          <img src="${image}" alt="${name}" loading="lazy"
               onerror="this.src='https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=automotive%20saas%20product&image_size=square'">
          ${stockBadge}
        </div>
        <div class="product-info">
          <span class="product-category">${CATEGORY_MAP[category] || category}</span>
          <h3 class="product-name">${name}</h3>
          <p class="product-desc">${description}</p>
          <div class="product-footer">
            <span class="product-price">$${price}<span class="per">/mo</span></span>
            <button class="btn btn-primary btn-sm view-detail-btn" data-id="${id}" type="button">
              <i class="fa-solid fa-eye"></i> View
            </button>
          </div>
        </div>
      </div>`;
    })
    .join('');

  // 卡片点击 → 弹窗（点击 stock-badge / View 按钮由各自处理或冒泡触发）
  grid.querySelectorAll('.product-card').forEach((card) => {
    card.addEventListener('click', (e) => {
      if (e.target.closest('.product-stock-badge')) return;
      const id = Number(card.dataset.id);
      openProductModal(id);
    });
  });
};

/* ============================================================
 * #7 Modal 持久化：overlay 一次性创建，事件只绑定一次
 *   - 通过 data-action 属性做事件委托，避免每次 openProductModal 重绑
 * ============================================================ */
const ensureModalOverlay = () => {
  let overlay = document.getElementById('productModalOverlay');
  if (overlay) return overlay;
  overlay = document.createElement('div');
  overlay.id = 'productModalOverlay';
  overlay.className = 'modal-overlay';
  document.body.appendChild(overlay);

  // #7：事件委托，只绑定一次
  overlay.addEventListener('click', (e) => {
    // 点击遮罩空白处关闭
    if (e.target === overlay) {
      closeProductModal();
      return;
    }
    const actionEl = e.target.closest('[data-action]');
    if (!actionEl) return;
    const action = actionEl.dataset.action;
    if (action === 'close') {
      closeProductModal();
    } else if (action === 'add-cart') {
      const id = Number(actionEl.dataset.id);
      const product = allProducts.find((p) => p.id === id);
      if (product) addToCartFromModal(product);
    } else if (action === 'lightbox') {
      const src = actionEl.dataset.src;
      if (src) openLightbox(src);
    }
  });

  // ESC 键关闭
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      const ov = document.getElementById('productModalOverlay');
      if (ov && ov.classList.contains('show')) closeProductModal();
      const lb = document.getElementById('lightbox');
      if (lb && lb.classList.contains('show')) closeLightbox();
    }
  });

  return overlay;
};

/**
 * 产品详情弹窗
 */
const openProductModal = (id) => {
  const product = allProducts.find((p) => p.id === id);
  if (!product) return;

  const { name, price, category, stock, image, description } = product;
  const lowStock = stock < 5;

  // #7：复用持久 overlay，只更新 innerHTML，事件由委托处理
  const overlay = ensureModalOverlay();
  overlay.innerHTML = `
    <div class="modal">
      <div class="modal-header">
        <h3>Product Details</h3>
        <button class="modal-close" data-action="close" type="button"><i class="fa-solid fa-xmark"></i></button>
      </div>
      <div class="modal-body">
        <div class="product-modal-content">
          <div class="product-modal-image" data-action="lightbox" data-src="${image}" title="Click to enlarge">
            <img src="${image}" alt="${name}"
                 onerror="this.src='https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=automotive%20saas%20product&image_size=square'">
          </div>
          <div class="product-modal-info">
            <span class="product-category">${CATEGORY_MAP[category] || category}</span>
            <h2 class="modal-product-name">${name}</h2>
            <div class="price">$${price}<span class="muted-text">/mo</span></div>
            <p class="description">${description || 'No description available.'}</p>
            <div class="product-modal-meta">
              <div class="meta-item">
                <div class="label">Category</div>
                <div class="value">${CATEGORY_MAP[category] || category}</div>
              </div>
              <div class="meta-item">
                <div class="label">Stock</div>
                <div class="value ${lowStock ? 'low-stock' : ''}">${stock} ${lowStock ? 'left!' : 'available'}</div>
              </div>
            </div>
            <button class="btn btn-accent btn-lg btn-full" data-action="add-cart" data-id="${id}" type="button"
                    ${stock <= 0 ? 'disabled' : ''}>
              <i class="fa-solid fa-cart-plus"></i> ${stock <= 0 ? 'Out of Stock' : 'Add to Cart'}
            </button>
          </div>
        </div>
      </div>
    </div>`;

  overlay.classList.add('show');
  document.body.classList.add('scroll-lock');
};

const closeProductModal = () => {
  const overlay = document.getElementById('productModalOverlay');
  if (overlay) {
    overlay.classList.remove('show');
    document.body.classList.remove('scroll-lock');
  }
};

/**
 * 加入购物车（弹窗内调用，含库存校验）
 */
const addToCartFromModal = (product) => {
  const cartItem = Storage.getCart().find((item) => item.id === product.id);
  const currentQty = cartItem ? cartItem.quantity : 0;

  if (currentQty >= product.stock) {
    Main.showToast('Insufficient stock!', 'error');
    return;
  }

  const { id, name, price, image, stock } = product;
  const result = Storage.addToCart({ id, name, price, image, stock });
  if (result === false) {
    // #3：addToCart 内部库存校验失败
    Main.showToast('Insufficient stock!', 'error');
    return;
  }
  Main.updateCartBadge();
  Main.showToast('Added to cart successfully!', 'success');
  closeProductModal();
};

/* ============================================================
 * #7 Lightbox 持久化：只创建一次，事件只绑定一次
 * ============================================================ */
const ensureLightbox = () => {
  let lb = document.getElementById('lightbox');
  if (lb) return lb;
  lb = document.createElement('div');
  lb.id = 'lightbox';
  lb.className = 'lightbox';
  document.body.appendChild(lb);
  // #7：只绑定一次 close
  lb.addEventListener('click', closeLightbox);
  return lb;
};

const openLightbox = (imageUrl) => {
  const lb = ensureLightbox();
  lb.innerHTML = `
    <button class="lightbox-close" type="button"><i class="fa-solid fa-xmark"></i></button>
    <img src="${imageUrl}" alt="Preview"
         onerror="this.src='https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=automotive%20saas%20product&image_size=square'">`;
  lb.classList.add('show');
  document.body.classList.add('scroll-lock');
};

const closeLightbox = () => {
  const lb = document.getElementById('lightbox');
  if (lb) {
    lb.classList.remove('show');
    document.body.classList.remove('scroll-lock');
  }
};

/* ============================================================
 * 首页精选产品
 *  #1 Details 按钮单独绑定 click + stopPropagation
 * ============================================================ */
const renderFeaturedProducts = (limit = 4) => {
  const grid = document.getElementById('featuredGrid');
  if (!grid) return;

  const featured = allProducts.slice(0, limit);
  if (featured.length === 0) {
    grid.innerHTML = '<p class="text-muted text-center">No products available.</p>';
    return;
  }

  grid.innerHTML = featured
    .map((product) => {
      const { id, name, price, category, stock, image, description } = product;
      const lowStock = stock < 5;
      return `
      <div class="product-card" data-id="${id}">
        <div class="product-image">
          <img src="${image}" alt="${name}" loading="lazy"
               onerror="this.src='https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=automotive%20saas%20product&image_size=square'">
          ${lowStock ? `<span class="product-stock-badge low">Low: ${stock}</span>` : `<span class="product-stock-badge">Stock: ${stock}</span>`}
        </div>
        <div class="product-info">
          <span class="product-category">${CATEGORY_MAP[category] || category}</span>
          <h3 class="product-name">${name}</h3>
          <p class="product-desc">${description}</p>
          <div class="product-footer">
            <span class="product-price">$${price}<span class="per">/mo</span></span>
            <button class="btn btn-outline btn-sm view-detail-btn" data-id="${id}" type="button">Details</button>
          </div>
        </div>
      </div>`;
    })
    .join('');

  // #1：Details 按钮单独绑定 click，stopPropagation 避免与卡片事件重复触发
  grid.querySelectorAll('.view-detail-btn').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = Number(btn.dataset.id);
      openProductModal(id);
    });
  });

  // 卡片本体点击仍可唤起弹窗（排除按钮 / 库存徽标区域）
  grid.querySelectorAll('.product-card').forEach((card) => {
    card.addEventListener('click', (e) => {
      if (e.target.closest('.view-detail-btn')) return;
      if (e.target.closest('.product-stock-badge')) return;
      const id = Number(card.dataset.id);
      openProductModal(id);
    });
  });
};

/* ============================================================
 * 页面初始化
 * ============================================================ */
const initProductsPage = async () => {
  await loadProductsData();
  readCategoryFromUrl();
  renderFilterBar();
  renderProductGrid();
};

const initFeaturedProducts = async () => {
  await loadProductsData();
  renderFeaturedProducts(4);
};

// #2：监听浏览器回退/前进
window.addEventListener('popstate', () => {
  const hasFilterBar = !!document.getElementById('filterBar');
  if (!hasFilterBar) return; // 非产品页忽略
  const prev = currentCategory;
  readCategoryFromUrl();
  if (prev !== currentCategory) {
    renderFilterBar();
    renderProductGrid();
  }
});

window.Products = {
  loadProductsData, filterProducts, renderFilterBar, renderProductGrid,
  openProductModal, closeProductModal, addToCartFromModal,
  openLightbox, closeLightbox, renderFeaturedProducts,
  initProductsPage, initFeaturedProducts, CATEGORY_MAP,
  normalizeProduct, updateUrlForCategory, readCategoryFromUrl
};

document.addEventListener('DOMContentLoaded', () => {
  // 仅首页（存在 featuredGrid）自动加载精选
  if (document.getElementById('featuredGrid')) {
    Products.initFeaturedProducts();
  }
});
