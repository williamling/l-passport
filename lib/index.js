const _ = require('lodash');
const util = require('util');
const Enum = require('./enum');

function checkConfig(config) {
  const provider = config.provider;
  if (!provider) throw Error('provider missing');
  if (this._configs[provider]) throw Error(`provider ${provider} already exist`);
  if (!this._strategies[provider]) throw Error(`the strategy of ${provider} is not existed`);
  if (!config.appId && !config.appSecret && !config.clients) throw Error('appId or appSecret missing');
}

function saveConfig(config) {
  if (config.clients && Array.isArray(config.clients)) this._configs[config.provider] = [].concat(configs.clients);
  if (config.appId && config.appSecret && !config.clients) this._configs[config.provider] = [].concat(config);
}

function getProviderConfig(configs, options) {
  if (!options) return configs[0];
  return configs.find(client => Object.keys(options).reduce((result, key)=> result && options[key] === client[key]));
}

class Passport {
  constructor() {
    this._configs = {};
    this._strategies = {};
  }
  
  use(name, strategy) {
    if (!name || typeof name !== 'string') throw new Error('Authentication strategies must have a name');
    if (!strategy || typeof strategy !== 'function') throw new Error('Authentication strategies must be a function');
    this._strategies[name] = strategy;
  }

  initialize(configs) {
    for (let config of configs) {
      checkConfig.bind(this)(config);
      saveConfig.bind(this)(config);
    }
  }

  authorization(provider, options) {
    if (!provider || !utils.isSting(provider)) throw new Error('provider must be a string');
    const configs = this._configs[provider];
    if (!configs) throw new Error(`the confis of ${provider} is not existed`);
    const config = getProviderConfig(configs, options);
    if (!config) throw new Error(`can not found the config of ${provider} by the options, please check up`);

    const Strategy = this._strategies[provider];
    if (!Strategy) throw new Error(`the strategy of ${provider} is not existed`);
    if (options && !util.isObject(options)) throw new Error('option must be object');

    return async function authorization(ctx, next) {
      if (ctx.state.passport) return await next();
      
      const code = ctx.query.code;
      const state = ctx.query.state || config.state || '';
      const scope = ctx.query.scope || config.scope || '';
      const redirect = ctx.query.redirect || config.redirect || '';

      const strategy = new Strategy(config);
      if (!code) {
        const redirectUrl = strategy.getAuthorizeUrl(redirect, state, scope);
        return ctx.redirect(redirectUrl);
      } else ctx.state.passport = await strategy.authorize(code, redirect);
      await next();
    }
  }
}

module.exports = Passport;
