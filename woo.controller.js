require("dotenv").config();
const axios = require("axios");
const WooCommerceRestApi = require("@woocommerce/woocommerce-rest-api").default;

const WooCommerce = new WooCommerceRestApi({
  url: "https://testingqmedia.websitepro.hosting",
  consumerKey: process.env.CK,
  consumerSecret: process.env.CS,
  version: "wc/v3",
});

class wooController {
  static async index(req, res) {
    res.status(200).send("Revel to Woo bridege is healthy!");
  }

  /**
   * CREATE CUSTOMER IN WOOCOMMERCE
   */
  static async createCustomer(req, res) {
    //notify revel
    res.send("Customer data received.");
    console.log("🔔 Customer webhook received from REVEL!");
    console.log(req.body);
    const customerDataFromRevel = req.body;
    // customer payload
    const data = {
      email: customerDataFromRevel.email,
      first_name: customerDataFromRevel.first_name || "",
      last_name: customerDataFromRevel.last_name || "",
      billing: {
        first_name: customerDataFromRevel.first_name || "",
        last_name: customerDataFromRevel.last_name || "",
        company: customerDataFromRevel.addresses[0].company_name || "",
        address_1: customerDataFromRevel.addresses[0].street_1 || "",
        address_2: customerDataFromRevel.addresses[0].street_2 || "",
        city: customerDataFromRevel.addresses[0].city || "",
        state: customerDataFromRevel.addresses[0].state || "",
        postcode: customerDataFromRevel.addresses[0].zipcode || "",
        country: customerDataFromRevel.addresses[0].country || "",
        email: customerDataFromRevel.addresses[0].email || "",
        phone: customerDataFromRevel.addresses[0].phone_number || "",
      },
      shipping: {
        first_name: customerDataFromRevel.first_name || "",
        last_name: customerDataFromRevel.last_name || "",
        company: customerDataFromRevel.company_name || "",
        address_1: customerDataFromRevel.addresses[0].street_1 || "",
        address_2: customerDataFromRevel.addresses[0].street_2 || "",
        city: customerDataFromRevel.addresses[0].city || "",
        state: customerDataFromRevel.addresses[0].state || "",
        postcode: customerDataFromRevel.addresses[0].zipcode || "",
        country: customerDataFromRevel.addresses[0].country || "",
      },
    };

    console.log("🔺 Creating customer in WooCommerce...");
    /**
     * Create customer in WooCommerce
     */
    await WooCommerce.post("customers", data)
      .then(async (response) => {
        console.log("🔺 Customer created in WooCommerce!");
        /**
         * Add customer reference id to Revel
         */
        var config = {
          method: "PATCH",
          url: `https://qep-partner.revelup.com/resources/Customer/${response.data.id}`,
          headers: {
            "API-AUTHENTICATION": `${process.env.REVEL_KEY}`,
            "Content-Type": "application/json",
          },
          data: {
            ref_number: response.data.id,
            updated_by: "/enterprise/User/1/",
          },
        };

        // add woo reference to customer
        await axios(config)
          .then(function (response) {
            console.log("🔺 Customer in REVEL. " + response.data.resource_uri);
            console.log("🔺 Added reference number in REVEL!");
          })
          .catch(function (error) {
            console.log(error.response.status);
            console.log(error.response.data);
          });
      })
      .catch((error) => {
        console.log(error.response.data);
      });
  }

  /**
   * DELETE CUSTOMER FROM WOOCOMMERCE
   */
  static async deleteCustomer(req, res) {
    //notify revel
    res.send("Customer delete request received.");
    const customerDataFromRevel = req.body;
    console.log(`🔔 Customer delete request received from REVEL! For ref ${customerDataFromRevel.ref_number}`);
    /**
     * DELETE CUSTOMER FROM WOOCOMMERCE (with reference number available)
     */
    if (
      customerDataFromRevel.ref_number !== null &&
      customerDataFromRevel.ref_number !== "" &&
      customerDataFromRevel.ref_number !== undefined
    ) {
      await WooCommerce.delete(`customers/${customerDataFromRevel.ref_number}`, {
        force: true,
      })
        .then((response) => {
          console.log("🔺 Customer deleted from WooCommerce!");
        })
        .catch((error) => {
          console.log(error.response.data);
        });
    } else {
      /**
       * DELETE CUSTOMER FROM WOOCOMMERCE (no reference number)
       */
      console.log(
        "🔺 Customer has no reference number in REVEL! Finding id by email... " +
          customerDataFromRevel.email
      );
      // find customer by email
      await WooCommerce.get("customers", { email: customerDataFromRevel.email })
        .then(async (response) => {
          console.log(
            "🔺 Search complete. Found customer with id: " + response.data[0].id
          );
          console.log("🔺 Deleting record with id:" + response.data[0].id);
          await WooCommerce.delete(`customers/${response.data[0].id}`, {
            force: true,
          })
            .then((response) => {
              console.log("🔺 Deleted!");
            })
            .catch((error) => {
              console.log(error.response.data);
            });
        })
        .catch((error) => {
          console.log(error.response.data);
        });
    }
  }

  /**
   * CREATE ORDER IN WOOCOMMERCE
   */
  static async createOrder(req, res) {
    //notify revel
    res.send("Order request received.");
    console.log("🔔 Order request received from REVEL!");
    let line = [];
    let customer = "",
      customer_details = "", //addresses[] formally
      order_delivery_details = "", //delivery_address[] formally
      transaction_id = "",
      woo_customer_id = "";

    const orderData = req.body;
    console.log(orderData)
    /**
     * GET CUSTOMER DETAILS FROM REVEL
     */
    var config = {
      method: "get",
      url: `https://qep-partner.revelup.com/${orderData.orderInfo.customer}`,
      headers: {
        "Content-Type": "application/json",
        "API-AUTHENTICATION": `${process.env.REVEL_KEY}`,
      },
    };

    console.log(
      `🔺 Finding customer details with ${orderData.orderInfo.customer}...`
    );
    await axios(config)
      .then(function (response) {
        customer = response.data;
        console.log(`🔺 Found ${customer.id}..`);
      })
      .catch(function (error) {
        console.log(error);
      });

    // validate email exists
    if (customer.email !== "" && customer.email !== null) {
    console.log(`🔺 Finding products by slug...`);
    for (let i = 0; i < orderData.items.length; i++) {
      /**
       * GET PRODUCT ID BY SLUG
       */
      await WooCommerce.get("products", {
        slug: orderData.items[i].product_name_override,
      })
        .then((response) => {
          console.log(`🔺 Found ${response.data[0].id}..`);
          line.push({
            product_id: response.data[0].id,
            quantity: orderData.items[i].quantity,
            total: orderData.items[i].split_parts.toString(),
          });
        })
        .catch((error) => {
          console.log(error.response.data);
        });
    }
    // check customer details exists
    if (customer.addresses.length > 0) {
      customer_details = customer.addresses[0];
    } else {
      console.log(`⚠️ Customer has no address details!`);
    }
    // check delivery address details
    if (orderData.delivery_address > 0) {
      order_delivery_details = orderData.delivery_address[0];
    } else {
      console.log(`⚠️ Customer has no delivery address details!`);
    }
    // check transaction id exists
    if (orderData.payments > 0) {
      transaction_id = orderData.payments[0].transaction_id;
    } else {
      console.log(`⚠️ Customer has no transaction id!`);
    }
      /**
       * FIND CUSTOMER BY EMAIL
       */
      console.log(
        "🔺 Searching customer id in woocommerce with email:" + response.data[0].id
      );
      await WooCommerce.get("customers", { email: customer.email })
        .then(async (response) => {
          console.log(
            "🔺 Search complete. Found customer with id: " + response.data[0].id
          );
          woo_customer_id = response.data[0].id;
        })
        .catch((error) => {
          console.log(error.response.data);
        });
      /**
       * CREATE ORDER
       */
      const data = {
        payment_method_title: "Paid in REVEL",
        set_paid: true,
        transaction_id: transaction_id,
        customer_id: woo_customer_id || "",
        billing: {
          first_name: customer.first_name || "",
          last_name: customer.last_name || "",
          address_1:
            customer_details.street_1 || order_delivery_details.street_1,
          address_2: customer_details.street_2 || "",
          city: customer_details.city || "",
          state: customer_details.state || "",
          postcode: customer_details.zipcode || "",
          country: customer_details.country || "US",
          email: customer.email || "",
          phone: customer.phone_number || "",
        },
        shipping: {
          first_name: customer.first_name || "",
          last_name: customer.last_name || "",
          address_1: order_delivery_details.street_1 || "",
          address_2: order_delivery_details.street_2 || "",
          city: order_delivery_details.city || "",
          state: order_delivery_details.state || "",
          postcode: order_delivery_details.zipcode || "",
          country: order_delivery_details.country || "US",
        },
        line_items: line,
      };
      console.log("🔺 Creating order in wooCommerce...");
      // create order
      await WooCommerce.post("orders", data)
        .then((response) => {
          console.log("🔺 Order created successfully! Id:" + response.data.id);
        })
        .catch((error) => {
          console.log(error.response.data);
        });
    } else {
      console.log(
        "⚠️ No customer email was found with order, cannot create order, no link to customer!"
      );
    }
  }
}

module.exports = wooController;
