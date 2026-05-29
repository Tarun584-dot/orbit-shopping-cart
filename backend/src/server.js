const http = require("http");
const crypto = require("crypto");
const path = require("path");
const fs = require("fs");
const productsPath = require.resolve("./data/products");

const PORT = 4000;
const users = new Map();
const sessions = new Map();
const carts = new Map();

function sendJson(res, status, payload) {
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,PATCH,DELETE,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type,Authorization"
  });
  res.end(JSON.stringify(payload));
}

function sendError(res, status, message, details) {
  sendJson(res, status, { error: message, ...(details ? { details } : {}) });
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let raw = "";
    req.on("data", (chunk) => {
      raw += chunk;
      if (raw.length > 1_000_000) {
        reject(new Error("Request body is too large."));
        req.destroy();
      }
    });
    req.on("end", () => {
      if (!raw) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(raw));
      } catch {
        reject(new Error("Request body must be valid JSON."));
      }
    });
  });
}

function getToken(req) {
  const header = req.headers.authorization || "";
  return header.startsWith("Bearer ") ? header.slice(7) : "";
}

function getCurrentUser(req) {
  const token = getToken(req);
  const email = sessions.get(token);
  if (!email) return null;
  return { email, token };
}

function requireUser(req, res) {
  const user = getCurrentUser(req);
  if (!user) {
    sendError(res, 401, "Please login before using the cart.");
    return null;
  }
  return user;
}

function getCart(email) {
  if (!carts.has(email)) carts.set(email, new Map());
  return carts.get(email);
}

function loadProducts() {
  delete require.cache[productsPath];
  return require(productsPath).products;
}

function productById(productId) {
  const products = loadProducts();
  return products.find((product) => product.id === Number(productId));
}

function formatCart(email) {
  const cart = getCart(email);
  const items = Array.from(cart.entries()).map(([productId, quantity]) => {
    const product = productById(productId);
    return {
      product,
      quantity,
      lineTotal: product.price * quantity
    };
  });
  return {
    items,
    total: items.reduce((sum, item) => sum + item.lineTotal, 0)
  };
}

function validateQuantity(quantity) {
  if (!Number.isInteger(quantity) || quantity < 0) {
    return "Quantity must be a whole number greater than or equal to 0.";
  }
  return "";
}

function serveImage(req, res) {
  const fileName = decodeURIComponent(req.url.replace("/images/", ""));
  const imagePath = path.join(__dirname, "..", "public", "images", fileName);
  if (!imagePath.startsWith(path.join(__dirname, "..", "public", "images"))) {
    sendError(res, 400, "Invalid image path.");
    return true;
  }
  if (!fs.existsSync(imagePath)) {
    sendError(res, 404, "Image not found.");
    return true;
  }
  res.writeHead(200, {
    "Content-Type": "image/svg+xml",
    "Access-Control-Allow-Origin": "*",
    "Cache-Control": "public, max-age=3600"
  });
  fs.createReadStream(imagePath).pipe(res);
  return true;
}

async function handleRequest(req, res) {
  if (req.method === "OPTIONS") {
    sendJson(res, 204, {});
    return;
  }

  const url = new URL(req.url, `http://${req.headers.host}`);
  const route = url.pathname;

  if (req.method === "GET" && route.startsWith("/images/")) {
    serveImage(req, res);
    return;
  }

  try {
    if (req.method === "GET" && route === "/health") {
      sendJson(res, 200, { status: "ok" });
      return;
    }

    if (req.method === "GET" && route === "/products") {
      const products = loadProducts();
      sendJson(res, 200, { products });
      return;
    }

    if (req.method === "POST" && route === "/auth/register") {
      const { name, email, password } = await parseBody(req);
      const normalizedEmail = String(email || "").trim().toLowerCase();
      if (!name || !normalizedEmail || !password) {
        sendError(res, 400, "Name, email, and password are required to register.");
        return;
      }
      if (String(password).length < 6) {
        sendError(res, 400, "Password must be at least 6 characters long.");
        return;
      }
      if (users.has(normalizedEmail)) {
        sendError(res, 409, "An account already exists for this email.");
        return;
      }
      users.set(normalizedEmail, { name: String(name).trim(), email: normalizedEmail, password });
      sendJson(res, 201, { message: "Registration successful. Please login." });
      return;
    }

    if (req.method === "POST" && route === "/auth/login") {
      const { email, password } = await parseBody(req);
      const normalizedEmail = String(email || "").trim().toLowerCase();
      const user = users.get(normalizedEmail);
      if (!user || user.password !== password) {
        sendError(res, 401, "Invalid email or password.");
        return;
      }
      const token = crypto.randomUUID();
      sessions.set(token, normalizedEmail);
      sendJson(res, 200, {
        token,
        user: { name: user.name, email: user.email }
      });
      return;
    }

    if (req.method === "GET" && route === "/cart") {
      const user = requireUser(req, res);
      if (!user) return;
      sendJson(res, 200, formatCart(user.email));
      return;
    }

    if (req.method === "POST" && route === "/cart/add") {
      const user = requireUser(req, res);
      if (!user) return;
      const { productId, quantity = 1 } = await parseBody(req);
      const product = productById(productId);
      if (!product) {
        sendError(res, 404, "Product not found.");
        return;
      }
      const quantityError = validateQuantity(quantity);
      if (quantityError || quantity === 0) {
        sendError(res, 400, quantityError || "Quantity must be at least 1 when adding to cart.");
        return;
      }
      const cart = getCart(user.email);
      const currentQuantity = cart.get(product.id) || 0;
      const nextQuantity = currentQuantity + quantity;
      if (nextQuantity > product.stock) {
        sendError(
          res,
          409,
          `Insufficient stock for ${product.name}. Only ${product.stock} available, and ${currentQuantity} already in cart.`
        );
        return;
      }
      cart.set(product.id, nextQuantity);
      sendJson(res, 200, formatCart(user.email));
      return;
    }

    if (req.method === "PATCH" && route === "/cart/update") {
      const user = requireUser(req, res);
      if (!user) return;
      const { productId, quantity } = await parseBody(req);
      const product = productById(productId);
      if (!product) {
        sendError(res, 404, "Product not found.");
        return;
      }
      const quantityError = validateQuantity(quantity);
      if (quantityError) {
        sendError(res, 400, quantityError);
        return;
      }
      const cart = getCart(user.email);
      if (quantity === 0) {
        cart.delete(product.id);
        sendJson(res, 200, formatCart(user.email));
        return;
      }
      if (quantity > product.stock) {
        sendError(res, 409, `Insufficient stock for ${product.name}. Only ${product.stock} available.`);
        return;
      }
      cart.set(product.id, quantity);
      sendJson(res, 200, formatCart(user.email));
      return;
    }

    if (req.method === "DELETE" && route.startsWith("/cart/remove/")) {
      const user = requireUser(req, res);
      if (!user) return;
      const productId = Number(route.split("/").pop());
      const product = productById(productId);
      if (!product) {
        sendError(res, 404, "Product not found.");
        return;
      }
      getCart(user.email).delete(product.id);
      sendJson(res, 200, formatCart(user.email));
      return;
    }

    if (req.method === "POST" && route === "/cart/checkout") {
      const user = requireUser(req, res);
      if (!user) return;
      const currentCart = formatCart(user.email);
      if (currentCart.items.length === 0) {
        sendError(res, 400, "Your cart is empty. Add an item before placing an order.");
        return;
      }
      carts.set(user.email, new Map());
      sendJson(res, 200, {
        message: "Order placed successfully.",
        order: { ...currentCart, createdAt: new Date().toISOString() }
      });
      return;
    }

    sendError(res, 404, "Route not found.");
  } catch (error) {
    sendError(res, 400, error.message || "Something went wrong.");
  }
}

http.createServer(handleRequest).listen(PORT, () => {
  console.log(`Cart One API running at http://localhost:${PORT}`);
});
