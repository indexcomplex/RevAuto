class indexController {
  static async index(req, res) {
    res
      .status(200)
      .send(
        "Bridege is healthy! <br><br>Health checkers: <a href='/woo-health' target='_blank'>Check Woocommerce To Revel Bridge Health</a> || <a href='/revel-health' target='_blank'>Check Revel To Woocommerce Bridge Health</a>"
      );
  }
}

module.exports = indexController;
