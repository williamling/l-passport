const Base = require('./base');
const Enum = require('../enum');
const queryString = require('querystring');
const request = require('request-promise-native');

const APPID = Symbol('appId');
const APPSECRET = Symbol('appSecret');

class WechatStrategy extends Base {
  constructor(config) {
    super();
    this[APPID] = config.appId;
    this[APPSECRET ] = config.appSecret ;
    this.baseUrl = 'https://api.weixin.qq.com';
    this.request = request.defaults({ forever: true, timeout: 10000, json: true, baseUrl: this.baseUrl });
  }

  async getTokenByCode(appId, secret, code) {
    const result = await this.request({
      method: 'GET',
      url: '/sns/oauth2/access_token',
      qs: {
        code,
        appid: appId,
        secret: secret,
        grant_type: 'authorization_code',
      }
    });
    if (!result || !result.access_token || !result.openid) {
      const errmsg = result && result.errmsg ? result.errmsg : 'unknown error';
      throw Error(`failed to get wechat token: ${errmsg}`);
    }
    return { openId: result.openid, accessToken: result.access_token, refreshToken: result.refresh_token };
  }

  async getUserInfo(openId, accessToken) {
    const result = await this.request({
      method: 'GET',
      url: '/sns/userinfo',
      qs: {
        openid: openId,
        access_token: accessToken,
      }   
    });
    if (!result || !result.openid) {
      const errmsg = result && result.errmsg ? result.errmsg : 'unknown error';
      throw Error(`failed to get wechat userinfo: ${errmsg}`);
    }
    return result;
  }

  _format(user) {
    if (!user) throw Error('invalid user information');
    return {
      body: user,
      openId: user.openId,
      avatar: user.headimgurl,
      nickname: user.nickname,
      provider: Enum.PlatformProvider.WECHAT,
    };
  }

  getAuthorizeUrl(redirect, state, scope) {
    if (!this[APPID]) throw Error('failed to get authorize url: appId missing');
    const url = 'https://open.weixin.qq.com/connect/oauth2/authorize';
    const query = {
      appid: this[APPID],
      redirect_uri: redirect,
      response_type: 'code',
      scope: scope || 'snsapi_userinfo',
      state: state || ''
    };
    return `${url}?${queryString.stringify(query)}#wechat_redirect`;
  }

  async authorize(code) {
    const appId = this[APPID];
    const secret = this[APPSECRET];
    if (!(appId || secret)) throw Error('appId or appSecret missing！');
    const { openId, accessToken, refreshToken } = await this.getTokenByCode(appId, secret, code);
    const user = await this.getUserInfo(openId, accessToken);
    return this._format(Object.assign({ openId, accessToken, refreshToken }, user));
  }
}

module.exports = WechatStrategy;
