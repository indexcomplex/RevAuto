// load API controller
const indexController = require("../controllers/index.controller");
const wooController = require("../controllers/woo.controller");
const revelController = require("../controllers/revel.controller");

// configure API routes
function routes(app) {
  // general API routes
  app.get("/", indexController.index);

  // woo API routes
  app.get("/woo-health", wooController.index);
  app.post("/woo-create-order", wooController.createOrder);
  app.post("/woo-create-customer", wooController.createCustomer);
  app.post("/woo-delete-customer", wooController.deleteCustomer);

  // revel API routes
  app.get("/revel-health", revelController.index);
  app.post("/revel-create-product", revelController.createProduct);
  app.post("/revel-create-order", revelController.createOrder);
  app.post("/revel-create-customer", revelController.createCustomer);
  app.post("/revel-delete-customer", revelController.deleteCustomer);
}

module.exports = routes;
