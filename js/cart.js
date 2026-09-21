/**
 * cart.js - 购物车模块
 * 负责：渲染购物车、数量加减、删除、清空、登录、订单计算、优惠券、下单
 * 使用 ES6+ 特性：解构赋值、模板字面量、箭头函数、let/const、默认参数
 */

// 运费常量（ES6 const）
const SHIPPING_FEE = 19.99;
// GST 税率 10%（澳大利亚消费税）
const GST_RATE = 0.10;

/**
 * 渲染购物车列表（ES6 模板字面量）
 */
const renderCartItems = () => {
  const container = document.getElementById('cartItems');
  if (!container) return;

  const cart = Storage.getCart();

  // 空购物车处理
  if (cart.length === 0) {
    container.innerHTML = `
      <div class="empty-cart">
        <i class="fa-solid fa-cart-shopping"></i>
        <h3>Your cart is empty</h3>
        <p>Looks like you haven't added any products yet.</p>
        <a href="products.html" class="btn btn-primary">
          <i class="fa-solid fa-store"></i> Continue Shopping
        </a>
      </div>`;
    // 隐藏订单汇总
    const summary = document.getElementById('orderSummary');
    if (summary) summary.classList.add('hidden');
    const actions = document.getElementById('cartActions');
    if (actions) actions.classList.add('hidden');
    return;
  }

  // ES6: map 生成购物车项
  container.innerHTML = cart
    .map((item) => {
      const { id, name, price, image, quantity } = item;
      const lineTotal = (price * quantity).toFixed(2);
      // ES6: 模板字面量
      return `
        <div class="cart-item" data-id="${id}">
          <div class="cart-item-thumb">
            <img src="${image}" alt="${name}" 
                 onerror="this.src='https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=automotive%20software%20product&image_size=square'">
          </div>
          <div class="cart-item-info">
            <div class="name">${name}</div>
            <div class="unit-price">$${price.toFixed(2)} / month</div>
          </div>
          <div class="qty-control">
            <button class="qty-btn" onclick="Cart.changeQty(${id}, -1)"><i class="fa-solid fa-minus"></i></button>
            <input type="number" class="qty-input" value="${quantity}" min="1" 
                   onchange="Cart.setQty(${id}, this.value)">
            <button class="qty-btn" onclick="Cart.changeQty(${id}, 1)"><i class="fa-solid fa-plus"></i></button>
          </div>
          <div class="cart-item-total">$${lineTotal}</div>
          <button class="cart-item-remove" onclick="Cart.removeItem(${id})" title="Remove">
            <i class="fa-solid fa-trash"></i>
          </button>
        </div>`;
    })
    .join('');

  // 显示订单汇总
  const summary = document.getElementById('orderSummary');
  if (summary) summary.classList.remove('hidden');
  const actions = document.getElementById('cartActions');
  if (actions) actions.classList.remove('hidden');

  // 渲染订单汇总
  renderOrderSummary();
};

/**
 * 修改数量（加减按钮）
 * @param {number} id - 产品 ID
 * @param {number} delta - 变化值
 */
const changeQty = (id, delta) => {
  // #3：库存校验失败时返回 false，提示用户并中止
  const result = Storage.changeCartQuantity(id, delta);
  if (result === false) {
    Main.showToast('Insufficient stock!', 'error');
    return;
  }
  Main.updateCartBadge();
  renderCartItems();
};

/**
 * 直接设置数量（输入框）
 * @param {number} id - 产品 ID
 * @param {number} value - 目标数量
 */
const setQty = (id, value) => {
  // #3：库存校验失败时返回 false
  const result = Storage.setCartQuantity(id, value);
  if (result === false) {
    Main.showToast('Insufficient stock!', 'error');
    renderCartItems();
    return;
  }
  Main.updateCartBadge();
  renderCartItems();
};

/**
 * 删除购物车商品
 * @param {number} id - 产品 ID
 */
const removeItem = (id) => {
  Storage.removeFromCart(id);
  Main.updateCartBadge();
  renderCartItems();
  Main.showToast('Item removed', 'info');
};

/**
 * 更新购物车（重新渲染并同步角标）
 */
const updateCart = () => {
  renderCartItems();
  Main.updateCartBadge();
  Main.showToast('Cart updated', 'success');
};

/**
 * 清空购物车（需确认）
 */
const clearCartWithConfirm = () => {
  // 使用自定义确认弹窗（避免用 confirm()）
  if (Storage.getCart().length === 0) {
    Main.showToast('Cart is already empty', 'info');
    return;
  }

  // 创建确认 Modal
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay show';
  overlay.innerHTML = `
    <div class="modal" style="max-width: 420px;">
      <div class="modal-header">
        <h3><i class="fa-solid fa-triangle-exclamation" style="color:var(--danger);"></i> Confirm Clear</h3>
        <button class="modal-close" onclick="this.closest('.modal-overlay').remove()"><i class="fa-solid fa-xmark"></i></button>
      </div>
      <div class="modal-body text-center">
        <p style="margin-bottom: 24px;">Are you sure you want to clear all items from your cart? This action cannot be undone.</p>
        <div style="display:flex; gap:10px; justify-content:center;">
          <button class="btn btn-ghost" onclick="this.closest('.modal-overlay').remove()">Cancel</button>
          <button class="btn btn-danger" id="confirmClearBtn">Yes, Clear Cart</button>
        </div>
      </div>
    </div>`;
  document.body.appendChild(overlay);
  document.body.style.overflow = 'hidden';

  document.getElementById('confirmClearBtn').addEventListener('click', () => {
    Storage.clearCart();
    Storage.clearCoupon();
    Main.updateCartBadge();
    renderCartItems();
    renderCouponStatus();
    overlay.remove();
    document.body.style.overflow = '';
    Main.showToast('Cart cleared', 'info');
  });

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      overlay.remove();
      document.body.style.overflow = '';
    }
  });
};

/**
 * 计算订单（ES6 解构赋值）
 * @returns {Object} { subtotal, gst, shipping, discount, total }
 */
const calculateOrder = () => {
  const cart = Storage.getCart();
  // ES6: reduce 求小计
  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const gst = subtotal * GST_RATE;
  const shipping = cart.length > 0 ? SHIPPING_FEE : 0;

  // 优惠券折扣
  const couponCode = Storage.getAppliedCoupon();
  let discount = 0;
  if (couponCode && Storage.isValidCoupon(couponCode)) {
    const coupon = Storage.getCouponDiscount(couponCode);
    discount = subtotal * coupon.discount;
  }

  // 总计 = 小计 - 折扣 + 运费（GST 已含在小计中按澳洲 SaaS 习惯，这里单独展示）
  const total = subtotal - discount + shipping + gst;
  return { subtotal, gst, shipping, discount, total };
};

/**
 * 渲染订单汇总（ES6 解构赋值 + 模板字面量）
 */
const renderOrderSummary = () => {
  const container = document.getElementById('orderSummary');
  if (!container) return;

  // ES6: 解构赋值提取订单计算结果
  const { subtotal, gst, shipping, discount, total } = calculateOrder();
  const couponCode = Storage.getAppliedCoupon();

  // ES6: 模板字面量
  container.innerHTML = `
    <h3>Order Summary</h3>
    <div class="summary-row">
      <span>Subtotal</span>
      <span>$${subtotal.toFixed(2)}</span>
    </div>
    <div class="summary-row">
      <span>GST (10%)</span>
      <span>$${gst.toFixed(2)}</span>
    </div>
    <div class="summary-row">
      <span>Shipping</span>
      <span>$${shipping.toFixed(2)}</span>
    </div>
    ${discount > 0 ? `
    <div class="summary-row discount">
      <span>Discount ${couponCode ? `(${couponCode})` : ''}</span>
      <span>-$${discount.toFixed(2)}</span>
    </div>` : ''}
    <div class="coupon-row">
      <input type="text" class="coupon-input" id="couponInput" 
             placeholder="Enter coupon code" value="${couponCode || ''}">
      <button class="btn btn-outline btn-sm" id="applyCouponBtn">Apply</button>
    </div>
    <p class="text-muted" style="font-size:0.8rem;">Try coupon: <strong>SAVE10</strong> for 10% off</p>
    <div class="summary-total">
      <span>Total</span>
      <span>$${total.toFixed(2)}</span>
    </div>
    <button class="btn btn-accent btn-lg" style="width:100%; margin-top:16px;" onclick="Cart.placeOrder()">
      <i class="fa-solid fa-credit-card"></i> Place Order
    </button>`;

  // 绑定优惠券应用按钮
  document.getElementById('applyCouponBtn').addEventListener('click', applyCoupon);
  document.getElementById('couponInput').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') applyCoupon();
  });
};

/**
 * 渲染优惠券状态（清空后重新渲染时用）
 */
const renderCouponStatus = () => {
  renderOrderSummary();
};

/**
 * 应用优惠券（ES6 箭头函数）
 */
const applyCoupon = () => {
  const input = document.getElementById('couponInput');
  const code = input.value.trim().toUpperCase();

  if (!code) {
    Storage.clearCoupon();
    renderOrderSummary();
    return;
  }

  if (Storage.isValidCoupon(code)) {
    Storage.saveAppliedCoupon(code);
    renderOrderSummary();
    Main.showToast(`Coupon ${code} applied!`, 'success');
  } else {
    Storage.clearCoupon();
    Main.showToast('Invalid coupon code', 'error');
    renderOrderSummary();
  }
};

/**
 * 客户登录（ES6 解构赋值）
 * 硬编码测试账号：admin/admin123
 */
const loginCustomer = () => {
  const usernameInput = document.getElementById('loginUsername');
  const passwordInput = document.getElementById('loginPassword');
  const username = usernameInput.value.trim();
  const password = passwordInput.value;

  // 表单验证
  if (!Validation.validateRequired(username)) {
    Validation.showFieldError('loginUsername', 'Please enter your username');
    return;
  }
  if (!Validation.validateRequired(password)) {
    Validation.showFieldError('loginPassword', 'Please enter your password');
    return;
  }

  // 硬编码测试账号校验 + 已注册客户校验
  let role = 'customer';
  let isValid = false;

  if (username === 'admin' && password === 'admin123') {
    isValid = true;
    role = 'admin';
  } else {
    // 检查是否为已注册客户
    const customer = Storage.getCustomerByUsername(username);
    if (customer && customer.password === password) {
      isValid = true;
      role = 'customer';
    }
  }

  if (!isValid) {
    Main.showToast('Invalid username or password', 'error');
    return;
  }

  Storage.setLoginState(username, role);
  Main.showToast(`Welcome back, ${username}!`, 'success');
  renderLoginStatus();
  Validation.clearAllErrors(document.getElementById('loginForm') || document);
};

/**
 * 渲染登录状态（已登录显示欢迎信息+登出，未登录显示登录表单）
 */
const renderLoginStatus = () => {
  const box = document.getElementById('loginBox');
  if (!box) return;

  const login = Storage.getLoginState();

  if (login.isLoggedIn) {
    // ES6: 模板字面量
    box.innerHTML = `
      <h3><i class="fa-solid fa-circle-check" style="color:var(--success);"></i> Logged In</h3>
      <p>Welcome back, <strong>${login.username}</strong>!</p>
      <p class="hint">Role: ${login.role === 'admin' ? 'Administrator' : 'Customer'}</p>
      <button class="btn btn-ghost btn-sm" onclick="Cart.logoutCustomer()">
        <i class="fa-solid fa-right-from-bracket"></i> Logout
      </button>`;
  } else {
    box.innerHTML = `
      <h3><i class="fa-solid fa-lock"></i> Login to Checkout</h3>
      <p class="text-muted" style="margin-bottom:16px;font-size:0.9rem;">Please log in to place your order.</p>
      <form id="loginForm" onsubmit="event.preventDefault(); Cart.loginCustomer();">
        <div class="form-group">
          <label>Username <span class="required">*</span></label>
          <input type="text" class="form-control" id="loginUsername" placeholder="Enter username"
                 oninput="Validation.clearFieldError('loginUsername')">
        </div>
        <div class="form-group">
          <label>Password <span class="required">*</span></label>
          <input type="password" class="form-control" id="loginPassword" placeholder="Enter password"
                 oninput="Validation.clearFieldError('loginPassword')">
        </div>
        <button type="submit" class="btn btn-primary" style="width:100%;">
          <i class="fa-solid fa-right-to-bracket"></i> Login
        </button>
      </form>
      <p class="hint">Demo account: <strong>admin</strong> / <strong>admin123</strong></p>`;
  }
};

/**
 * 退出登录
 */
const logoutCustomer = () => {
  Storage.logout();
  Main.showToast('Logged out', 'info');
  renderLoginStatus();
};

/**
 * 下单（ES6 解构赋值）
 * 校验登录、库存，清空购物车
 */
const placeOrder = () => {
  // 1. 登录校验
  const login = Storage.getLoginState();
  if (!login.isLoggedIn) {
    Main.showToast('Please login first to place your order', 'error');
    // 滚动到登录区
    document.getElementById('loginBox').scrollIntoView({ behavior: 'smooth' });
    return;
  }

  // 2. 购物车非空校验
  const cart = Storage.getCart();
  if (cart.length === 0) {
    Main.showToast('Your cart is empty', 'error');
    return;
  }

  // 3. 计算订单（ES6 解构）
  const { subtotal, gst, shipping, discount, total } = calculateOrder();
  const couponCode = Storage.getAppliedCoupon();

  // 4. 显示订单确认 Modal
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay show';
  overlay.innerHTML = `
    <div class="modal" style="max-width: 480px;">
      <div class="modal-header">
        <h3><i class="fa-solid fa-circle-check" style="color:var(--success);"></i> Order Confirmed</h3>
      </div>
      <div class="modal-body">
        <p style="margin-bottom: 20px;">Thank you for your order, <strong>${login.username}</strong>! Your subscription has been activated.</p>
        <div style="background: var(--bg); padding: 20px; border-radius: 8px; margin-bottom: 20px;">
          <div class="summary-row"><span>Subtotal</span><span>$${subtotal.toFixed(2)}</span></div>
          <div class="summary-row"><span>GST (10%)</span><span>$${gst.toFixed(2)}</span></div>
          <div class="summary-row"><span>Shipping</span><span>$${shipping.toFixed(2)}</span></div>
          ${discount > 0 ? `<div class="summary-row discount"><span>Discount</span><span>-$${discount.toFixed(2)}</span></div>` : ''}
          <div class="summary-total"><span>Total Paid</span><span>$${total.toFixed(2)}</span></div>
        </div>
        <p class="text-muted" style="font-size:0.85rem;">Order ID: #INF-${Date.now().toString().slice(-8)}</p>
        <button class="btn btn-primary" style="width:100%;" onclick="Cart.confirmOrder()">Continue Shopping</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);
  document.body.style.overflow = 'hidden';

  // 清空购物车与优惠券
  Storage.clearCart();
  Storage.clearCoupon();
  Main.updateCartBadge();
};

/**
 * 确认订单后关闭弹窗并重新渲染
 */
const confirmOrder = () => {
  const overlay = document.querySelector('.modal-overlay.show');
  if (overlay) overlay.remove();
  document.body.style.overflow = '';
  renderCartItems();
  renderLoginStatus();
};

/**
 * 购物车页初始化
 */
const initCartPage = () => {
  renderCartItems();
  renderLoginStatus();
};

// 暴露 API
window.Cart = {
  renderCartItems, changeQty, setQty, removeItem, updateCart,
  clearCartWithConfirm, calculateOrder, renderOrderSummary,
  applyCoupon, loginCustomer, renderLoginStatus, logoutCustomer,
  placeOrder, confirmOrder, initCartPage
};
