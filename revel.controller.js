require("dotenv").config();
const axios = require("axios");
const { v4: uuidv4 } = require("uuid");
const WooCommerceRestApi = require("@woocommerce/woocommerce-rest-api").default;
const WooCommerce = new WooCommerceRestApi({
  url: "https://testingqmedia.websitepro.hosting",
  consumerKey: process.env.CK,
  consumerSecret: process.env.CS,
  version: "wc/v3",
});

class revelController {
  static async index(req, res) {
    await WooCommerce.get("customers", { email: "tester@test.com" })
      .then((response) => {
        console.log(response.data);
      })
      .catch((error) => {
        console.log(error.response.data);
      });
    res.status(200).send("Woo to Revel bridege is healthy!");
  }

  static async createProduct(req, res) {
    //notify woo
    res.send("Product data received.");
    console.log("🔔 Product webhook received!");
    let wooProductData = req.body;

    var getCatConfig = {
      method: "GET",
      url: `https://qep-partner.revelup.com/products/ProductCategory/?name=${wooProductData.categories[0].name}&parent=1432`,
      headers: {
        Accept: "application/json",
        "API-AUTHENTICATION": `${process.env.REVEL_KEY}`,
      },
    };

    await axios(getCatConfig)
      .then(async (response) => {
        var productCreateData = {
          attribute_type: 0,
          category: `/products/ProductCategory/${response.data.objects[0].id}/`,
          created_by: "/enterprise/User/1/",
          sku: wooProductData.sku,
          establishment: "/enterprise/Establishment/21/",
          name: wooProductData.name,
          created_date: wooProductData.date_created,
          updated_date: wooProductData.date_modified,
          price: wooProductData.price,
          sorting: 12,
          tax_class: 0,
          updated_by: "/enterprise/User/1/",
          variable_pricing_by: 1,
          type: 1,
        };
        console.log(productCreateData);
        var createProdctConfig = {
          method: "post",
          url: "https://qep-partner.revelup.com/resources/Product/",
          headers: {
            "Content-Type": "application/json",
            "API-AUTHENTICATION": `${process.env.REVEL_KEY}`,
          },
          data: productCreateData,
        };

        await axios(createProdctConfig)
          .then(function (response) {
            console.log("Product Created. " + response.data.resource_uri);
          })
          .catch(function (error) {
            console.log(error.response.data);
          });
      })
      .catch(function (error) {
        console.log(error.response);
      });
  }

  static async createCustomer(req, res) {
    //notify woo
    res.send("Customer data received.");
    console.log("🔔 Order webhook received!");
    var data = req.body;

    var config = {
      method: "post",
      url: "https://qep-partner.revelup.com/resources/Customer/",
      headers: {
        "API-AUTHENTICATION": `${process.env.REVEL_KEY}`,
        "Content-Type": "application/json",
      },
      data: data,
    };

    // create customer
    await axios(config)
      .then(function (response) {
        console.log("Customer created. " + response.data.resource_uri);
      })
      .catch(function (error) {
        console.log(error.response.status);
        console.log(error.response.data);
      });
  }

  static async deleteCustomer(req, res) {
    //notify woo
    res.send("Recieved delete request.");
    console.log("🔔 Delete customer webhook received!");
    console.log(req.body.id);

    let ref_number = 5;

    /**
     * Find customer using ref number
     * @param {int} ref_number - woocommerce customerId
     */
    var getConfig = {
      method: "GET",
      url: `https://qep-partner.revelup.com/resources/Customer/?ref_number=${ref_number}`,
      headers: {
        Accept: "application/json",
        "API-AUTHENTICATION": `${process.env.REVEL_KEY}`,
      },
    };

    console.log("Identifing customer by ref_number...");
    // find customer by ref_number
    await axios(getConfig).then(async function (response) {
      let customerData = response.data;
      /**
       * Delete if customer found
       */
      if (customerData.objects.length > 0) {
        console.log("Customer found, deleting record...");
        console.log(customerData.objects[0].ref_number);

        var deletConfig = {
          method: "DELETE",
          url: `https://qep-partner.revelup.com/resources/Customer/${customerData.objects[0].id}/`,
          headers: {
            "API-AUTHENTICATION": `${process.env.REVEL_KEY}`,
          },
        };

        // delete customer
        await axios(deletConfig)
          .then(function (response) {
            // No content
            if (response.status === 204) {
              console.log(
                "Customer deleted successfully. " +
                  customerData.objects[0].email
              );
            }
          })
          .catch(function (error) {
            console.log(error);
          });
      } else {
        console.log(
          "Customer not found! Couldn't delete with ref_number " + ref_number
        );
      }
    });
  }

  static async createOrder(req, res) {
    //notify woo
    res.send("Recieved order.");
    console.log("🔔 Order webhook received from REVEl!");
    console.log(req.body);
    const orderData = req.body;
    
    /**
     * Customer Group URI
     */
    let customerGroup = "";

    const groups = {
      wcm: "/resources/CustomerGroup/104/",
      ql: "/resources/CustomerGroup/71/",
    };

    switch (orderData.line_items[0].name) {
      case "Wine Club Membership":
        customerGroup = groups.wcm;
        break;
      default:
        customerGroup = groups.ql;
        break;
    }

    /**
     * Find customer by email and get URI - OR - create customer if not found
     */
    let customerURI = "";

    var config = {
      method: "get",
      url: `https://qep-partner.revelup.com/resources/Customer/?email=${orderData.billing.email}`,
      headers: {
        Accept: "application/json",
        "API-AUTHENTICATION": `${process.env.REVEL_KEY}`,
      },
    };
    console.log("Finding customer by email...");
    // find customer by email
    await axios(config)
      .then(async function (response) {
        let customerData = response.data;
        /**
         * Create customer if not found
         */
        if (customerData.objects.length < 1) {
          console.log("Customer not found, creating record...");
          console.log(
            "Sending request to get customer id from woocommerce for reference..."
          );
          /**
           * Get customer id from woocommerce to add as reference
           */
          await WooCommerce.get("customers")
            .then(async (response) => {
              console.log(response.data)
              let wooCustomerData = response.data.dd;
              console.log(wooCustomerData)
              //create customer
              var createCustomerData = {
                accept_checks: false,
                customer_groups: [`${customerGroup}`],
                ok_to_email: true,
                tax_exempt: false,
                track_as_company: false,
                created_by: "/enterprise/User/1/",
                updated_by: "/enterprise/User/1/",
                active: true,
                address: orderData.billing.address_1,
                city: orderData.billing.city,
                created_date: orderData.date_created_gmt,
                email: orderData.billing.email,
                first_name: orderData.billing.first_name,
                last_name: orderData.billing.last_name,
                phone_number: orderData.billing.phone,
                note: "Synced from WooCommerce.",
                ref_number: wooCustomerData[0].id,
                state: orderData.billing.state,
                updated_date: orderData.date_modified_gmt,
                uuid: uuidv4(),
                zipcode: orderData.billing.postcode,
              };
              var createCustomerConfig = {
                method: "post",
                url: "https://qep-partner.revelup.com/resources/Customer/",
                headers: {
                  "API-AUTHENTICATION": `${process.env.REVEL_KEY}`,
                  "Content-Type": "application/json",
                },
                data: createCustomerData,
              };

              await axios(createCustomerConfig)
                .then(function (response) {
                  console.log("Sending request to create customer..");
                  console.log("Customer created successfully... ");
                  customerURI = response.data.objects[0].resource_uri;
                  console.log("Adding URI... " + customerURI);
                })
                .catch(function (error) {
                  console.log(error);
                });
            })
            .catch((error) => {
              console.log(error);
            });
        } else {
          /**
           * add customer URI
           */
          customerURI = customerData.objects[0].resource_uri;
          console.log("Customer found, adding URI... " + customerURI);
        }
      })
      .catch(function (error) {
        console.log(error);
      });
    /**
     * Create order
     */
    let createOrderdata = {
      delivery_address: {
        id: uuidv4(),
        active: true,
        city: orderData.billing.city || "",
        primary_billing: true,
        primary_shipping: false,
        company_name: orderData.billing.company || '',
        country: orderData.billing.country || "",
        created_date: orderData.date_created_gmt,
        updated_date: orderData.date_created_gmt,
        delivery_instructions: orderData.customer_note || "",
        email: orderData.billing.email,
        name:
          orderData.billing.first_name +
          " " +
          orderData.billing.last_name +
          " Address",
        phone_number: orderData.billing.phone || "",
        state: orderData.billing.state || "", 
        street_1: orderData.billing.address_1 || "",
        street_2: orderData.billing.address_2 || "",
        zipcode: orderData.billing.postcode || "",
        uuid: uuidv4(),
      },
      pos_mode: "Q",
      establishment: "/enterprise/Establishment/21/",
      updated_date: orderData.date_modified_gmt,
      dining_option: 5,
      created_at: "/resources/PosStation/23/",
      final_total: parseFloat(orderData.total),
      created_date: orderData.date_created_gmt,
      has_items: true,
      created_by: "/enterprise/User/1/",
      uuid: uuidv4(),
      updated_by: "/enterprise/User/1/",
      bills_info: `Woocommerce order #${orderData.id} sync`,
      subtotal: parseFloat(orderData.total),
      remaining_due: 0,
      surcharge: 0,
      tax: parseFloat(orderData.total_tax),
      //customer: customerURI,
      tax_country: "usa",
    };

    var createOrderConfig = {
      method: "POST",
      url: "https://qep-partner.revelup.com/resources/Order/",
      headers: {
        "API-AUTHENTICATION": `${process.env.REVEL_KEY}`,
        "Content-Type": "application/json",
      },
      data: createOrderdata,
    };
    console.log("Creating order...");
    //create order
    await axios(createOrderConfig)
      .then(async (response) => {
        console.log("Order created...");
        function getRandomInt(max) {
          return Math.floor(Math.random() * max);
        }
        let orderCreated = response.data;
        /**
         * Create order object to add in order item
         */
        console.log(`Order #${orderCreated.id} created.`);
        for (let i = 0; i < orderData.line_items.length; i++) {
          let productId = 7397;
          /**
           * Get product id
           */
          var config = {
            method: "GET",
            url: `https://qep-partner.revelup.com/resources/Product/?name=${orderData.line_items[0].name}`,
            headers: {
              Accept: "application/json",
              "API-AUTHENTICATION": `${process.env.REVEL_KEY}`,
            },
          };

          await axios(config)
            .then(function (response) {
              productId = response.data.id;
            })
            .catch(function (error) {
              console.log(error);
            });

          var orderItemData = {
            created_by: "/enterprise/User/1/",
            created_date: orderCreated.created_date,
            dining_option: 3,
            modifier_amount: 0,
            order: orderCreated.resource_uri,
            price: parseFloat(orderData.line_items[i].total),
            quantity: orderData.line_items[i].quantity,
            product: `/resources/Product/${productId}/`,
            station: "/resources/PosStation/23/",
            tax_amount: parseFloat(orderData.line_items[i].total_tax),
            tax_rate: 0,
            temp_sort: getRandomInt(2147483647),
            updated_by: "/enterprise/User/1/",
            uuid: uuidv4(),
            updated_date: orderCreated.updated_date,
          };

          var config = {
            method: "post",
            url: "https://qep-partner.revelup.com/resources/OrderItem/",
            headers: {
              "Content-Type": "application/json",
              "API-AUTHENTICATION": `${process.env.REVEL_KEY}`,
            },
            data: orderItemData,
          };
          console.log("Creating order item object..");
          //add order item to order object
          await axios(config)
            .then(function (response) {
              console.log("Added order item to order object.");
              console.log("Order item object id: " + response.data.id);
            })
            .catch(function (error) {
              console.log(error.response.data);
            });
        }
        console.log("🔺 Adding product in REVEL process was completed!");
      })
      .catch(function (error) {
        console.log(error);
      });
  }
}

module.exports = revelController;
