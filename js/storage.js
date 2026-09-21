/**
 * storage.js - 数据层核心模块
 * 封装所有 localStorage 操作，提供统一 API
 * 涵盖：购物车 / 产品 / 客户 / 反馈 / 登录状态 的增删改查
 * 使用 ES6+ 特性：箭头函数、默认参数、展开运算符、解构赋值、let/const
 */

// ES6: 使用 const 定义不可重新赋值的常量（localStorage 键名映射表）
const STORAGE_KEYS = {
  CART: 'infomedia_cart',           // 购物车
  PRODUCTS: 'infomedia_products',   // 产品列表
  CUSTOMERS: 'infomedia_customers', // 客户列表
  FEEDBACKS: 'infomedia_feedbacks', // 反馈列表
  LOGIN: 'infomedia_login',         // 登录状态
  COUPON: 'infomedia_coupon',       // 当前优惠券
  SUPPORT: 'infomedia_support'      // 支持工单
};

/**
 * 通用读取函数（带默认值，ES6 默认参数）
 * @param {string} key - localStorage 键名
 * @param {*} defaultValue - 当读取失败或为空时返回的默认值
 * @returns {*} 解析后的数据
 */
const readStorage = (key, defaultValue = null) => {
  // ES6: 箭头函数简化回调
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : defaultValue;
  } catch (err) {
    console.error(`[Storage] 读取 ${key} 失败:`, err);
    return defaultValue;
  }
};

/**
 * 通用写入函数
 * @param {string} key - localStorage 键名
 * @param {*} value - 要写入的数据（会被 JSON 序列化）
 */
const writeStorage = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (err) {
    console.error(`[Storage] 写入 ${key} 失败:`, err);
    return false;
  }
};

/* ==================== 购物车相关 ==================== */

// 获取购物车（ES6 默认参数：无购物车时返回空数组）
const getCart = () => readStorage(STORAGE_KEYS.CART, []);

// 保存购物车
const saveCart = (cart) => writeStorage(STORAGE_KEYS.CART, cart);

// 清空购物车
const clearCart = () => {
  localStorage.removeItem(STORAGE_KEYS.CART);
};

/**
 * 添加商品到购物车（ES6 展开运算符 + 解构赋值）
 *  #3 修复点：
 *   - 已存在商品 → 累加数量，不重复插入相同 id 的新条目
 *   - 库存校验：加购后数量不得超过 product.stock（若 stock 缺失视为 Infinity）
 *   - 校验失败返回 false，调用方可据此提示用户
 * @param {Object} product - 要添加的产品
 * @param {number} [qty=1] - 本次加购数量
 * @returns {Array|boolean} 更新后的购物车；库存不足时返回 false
 */
const addToCart = (product, qty = 1) => {
  const cart = getCart();
  // ES6: 解构赋值提取 id / stock
  const { id } = product;
  const stock = Number.isFinite(Number(product.stock)) ? Number(product.stock) : Infinity;
  const addQty = Math.max(1, parseInt(qty, 10) || 1);
  const existing = cart.find((item) => item.id === id);

  // 库存校验：当前数量 + 本次新增 不得超过库存
  const currentQty = existing ? existing.quantity : 0;
  if (currentQty + addQty > stock) {
    return false;
  }

  if (existing) {
    // #3：已存在则数量累加，不重复插入
    existing.quantity += addQty;
  } else {
    // ES6: 展开运算符将产品字段合并进购物车项，并新增 quantity 字段
    cart.push({ ...product, quantity: addQty });
  }
  saveCart(cart);
  return cart;
};

/**
 * 修改购物车商品数量
 *  #3 修复点：增加库存上限校验，不得超过 product.stock
 * @param {number} id - 产品 ID
 * @param {number} delta - 数量变化值（+1 或 -1）
 * @returns {Array|boolean} 更新后的购物车；超出库存时返回 false
 */
const changeCartQuantity = (id, delta) => {
  let cart = getCart();
  const item = cart.find((it) => it.id === id);
  if (item) {
    const stock = Number.isFinite(Number(item.stock)) ? Number(item.stock) : Infinity;
    const next = item.quantity + delta;
    // #3：上限校验
    if (next > stock) return false;
    item.quantity = next;
    if (item.quantity <= 0) {
      // 数量降为 0 则移除该商品
      cart = cart.filter((it) => it.id !== id);
    }
  }
  saveCart(cart);
  return cart;
};

/**
 * 设置购物车商品的具体数量
 *  #3 修复点：增加库存上限校验
 * @param {number} id - 产品 ID
 * @param {number} quantity - 目标数量
 * @returns {Array|boolean} 更新后的购物车；超出库存时返回 false
 */
const setCartQuantity = (id, quantity) => {
  let cart = getCart();
  const item = cart.find((it) => it.id === id);
  if (item) {
    const stock = Number.isFinite(Number(item.stock)) ? Number(item.stock) : Infinity;
    const target = Math.max(1, parseInt(quantity, 10) || 1);
    // #3：上限校验
    if (target > stock) return false;
    item.quantity = target;
  }
  saveCart(cart);
  return cart;
};

// 从购物车移除商品（ES6 箭头函数 + filter）
const removeFromCart = (id) => {
  const cart = getCart().filter((item) => item.id !== id);
  saveCart(cart);
  return cart;
};

// 计算购物车商品总数量（用于角标显示）
const getCartCount = () => {
  // ES6: 箭头函数 + reduce 求和
  return getCart().reduce((sum, item) => sum + item.quantity, 0);
};

/* ==================== 产品相关 ==================== */

// 获取产品列表（如果 localStorage 没有则返回 null，由调用方从 JSON 加载）
const getProducts = () => readStorage(STORAGE_KEYS.PRODUCTS, null);

// 保存产品列表
const saveProducts = (products) => writeStorage(STORAGE_KEYS.PRODUCTS, products);

/**
 * 添加新产品（ES6 展开运算符）
 * @param {Object} product - 新产品（不含 id，自动生成）
 * @returns {Array} 更新后的产品列表
 */
const addProduct = (product) => {
  const products = getProducts() || [];
  // ES6: 展开运算符生成新数组，自动生成递增 id
  const newProduct = { ...product, id: getNextProductId(products) };
  const updated = [...products, newProduct];
  saveProducts(updated);
  return updated;
};

// 生成下一个产品 ID（ES6 默认参数 + 箭头函数）
const getNextProductId = (products = []) => {
  if (products.length === 0) return 1;
  // ES6: 箭头函数 + Math.max + 展开运算符
  return Math.max(...products.map((p) => p.id)) + 1;
};

/**
 * 更新产品（ES6 箭头函数 + 三元运算符）
 * @param {number} id - 要更新的产品 ID
 * @param {Object} updates - 要更新的字段
 */
const updateProduct = (id, updates) => {
  const products = getProducts() || [];
  const updated = products.map((p) => (p.id === id ? { ...p, ...updates } : p));
  saveProducts(updated);
  return updated;
};

// 删除产品（ES6 箭头函数 + filter）
const deleteProduct = (id) => {
  const products = (getProducts() || []).filter((p) => p.id !== id);
  saveProducts(products);
  return products;
};

// 按 ID 查询单个产品（ES6 箭头函数 + find）
const getProductById = (id) => {
  const products = getProducts() || [];
  return products.find((p) => p.id === Number(id));
};

/* ==================== 客户相关 ==================== */

// 获取所有客户（ES6 默认参数）
const getCustomers = () => readStorage(STORAGE_KEYS.CUSTOMERS, []);

/**
 * 添加客户（ES6 展开运算符）
 * @param {Object} customer - 新客户信息
 * @returns {boolean} 是否添加成功（用户名重复时返回 false）
 */
const addCustomer = (customer) => {
  const customers = getCustomers();
  // 检查用户名是否已存在
  if (customers.some((c) => c.username === customer.username)) {
    return false;
  }
  const updated = [...customers, { ...customer, registeredAt: new Date().toISOString() }];
  writeStorage(STORAGE_KEYS.CUSTOMERS, updated);
  return true;
};

// 按用户名查询客户（用于登录校验）
const getCustomerByUsername = (username) => {
  return getCustomers().find((c) => c.username === username);
};

/* ==================== 反馈相关 ==================== */

// 获取所有反馈（ES6 默认参数，按时间倒序）
const getFeedbacks = () => {
  const list = readStorage(STORAGE_KEYS.FEEDBACKS, []);
  // ES6: 箭头函数 + sort 倒序排列（最新在前）
  return list.sort((a, b) => new Date(b.date) - new Date(a.date));
};

/**
 * 添加反馈（ES6 展开运算符）
 * @param {Object} feedback - 反馈内容
 */
const addFeedback = (feedback) => {
  const feedbacks = getFeedbacks();
  const newFeedback = { ...feedback, id: Date.now(), date: new Date().toISOString() };
  const updated = [newFeedback, ...feedbacks];
  writeStorage(STORAGE_KEYS.FEEDBACKS, updated);
  return newFeedback;
};

/* ==================== 支持工单相关 ==================== */

// 获取所有支持工单
const getSupportTickets = () => readStorage(STORAGE_KEYS.SUPPORT, []);

// 添加支持工单（ES6 展开运算符）
const addSupportTicket = (ticket) => {
  const tickets = getSupportTickets();
  const newTicket = { ...ticket, id: Date.now(), status: 'open', date: new Date().toISOString() };
  const updated = [newTicket, ...tickets];
  writeStorage(STORAGE_KEYS.SUPPORT, updated);
  return newTicket;
};

/* ==================== 登录状态相关 ==================== */

/**
 * 获取登录状态（ES6 默认参数：未登录时返回默认对象）
 * @returns {Object} { isLoggedIn, username, role }
 */
const getLoginState = () =>
  readStorage(STORAGE_KEYS.LOGIN, { isLoggedIn: false, username: '', role: 'guest' });

/**
 * 设置登录状态（ES6 解构赋值 + 默认参数）
 * @param {string} username - 用户名
 * @param {string} role - 角色（customer / admin）
 */
const setLoginState = (username, role = 'customer') => {
  const state = { isLoggedIn: true, username, role };
  writeStorage(STORAGE_KEYS.LOGIN, state);
  return state;
};

// 退出登录（重置为未登录默认状态）
const logout = () => {
  writeStorage(STORAGE_KEYS.LOGIN, { isLoggedIn: false, username: '', role: 'guest' });
};

/* ==================== 优惠券相关 ==================== */

// 获取当前已应用的优惠券
const getAppliedCoupon = () => readStorage(STORAGE_KEYS.COUPON, null);

// 保存已应用的优惠券
const saveAppliedCoupon = (code) => writeStorage(STORAGE_KEYS.COUPON, code);

// 清除优惠券
const clearCoupon = () => localStorage.removeItem(STORAGE_KEYS.COUPON);

/**
 * 有效的优惠券映射表（ES6 const 对象）
 * SAVE10: 打 9 折（即减 10%）
 */
const VALID_COUPONS = {
  SAVE10: { discount: 0.1, label: '10% OFF' }
};

// 校验优惠券是否有效（ES6 箭头函数 + in 运算符）
const isValidCoupon = (code) => code in VALID_COUPONS;

// 获取优惠券折扣信息
const getCouponDiscount = (code) => VALID_COUPONS[code] || null;

// 暴露所有 API 到全局作用域（供其他 JS 文件调用）
window.Storage = {
  getCart, saveCart, clearCart, addToCart, changeCartQuantity, setCartQuantity,
  removeFromCart, getCartCount,
  getProducts, saveProducts, addProduct, updateProduct, deleteProduct, getProductById,
  getCustomers, addCustomer, getCustomerByUsername,
  getFeedbacks, addFeedback,
  getSupportTickets, addSupportTicket,
  getLoginState, setLoginState, logout,
  getAppliedCoupon, saveAppliedCoupon, clearCoupon,
  isValidCoupon, getCouponDiscount
};
