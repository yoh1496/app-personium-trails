class PersoniumAuthState {
  constructor() {
    this.accessToken = null;
    this.boxUrl = null;
    this._targetCell = null;
  }
}

export const authState = new PersoniumAuthState();

function composeFormBody(data) {
  return Object.entries(data)
    .map(([key, val]) => `${key}=${encodeURIComponent(val)}`)
    .join('&');
}

async function getBoxUrl(targetCell, { access_token }) {
  const res = await fetch(`${targetCell}__box`, {
    headers: { Authorization: `Bearer ${access_token}` },
  });
  return res.headers.get('location');
}

class PersoniumLoginROPC {
  constructor(targetCell, targetBoxName, username, password) {
    this._loginAsync = null;
    this._refreshAsync = null;
    this._username = username;
    this._password = password;
    this._targetCell = targetCell;
    this._boxUrl = `${targetCell}${targetBoxName}/`;
  }
  async loginAsync() {
    if (this._loginAsync !== null) {
      console.log('`loginAsync` is already started');
      return this._loginAsync;
    }

    console.log('`loginAsync` is started newly');

    return (this._loginAsync = new Promise((resolve, reject) => {
      const data = {
        grant_type: 'password',
        username: this._username,
        password: this._password,
      };
      fetch(`${this._targetCell}__token`, {
        credentials: 'include',
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: composeFormBody(data),
      })
        .then(res => res.json())
        .then(jsonDat => {
          this._loginAsync = null;
          authState.accessToken = jsonDat;
          authState.boxUrl = this._boxUrl;
          authState._targetCell = this._targetCell;
          console.log({ authState });
          resolve();
        })
        .catch(reject);
    }));
  }

  async refreshAsync() {
    if (this._refreshAsync !== null) {
      console.log('`refreshAsync` is already started');
      return this._refreshAsync;
    }

    console.log('`refreshAsync` is started newly');
    return (this._refreshAsync = new Promise((resolve, reject) => {
      const data = {
        grant_type: 'refresh_token',
        refresh_token: authState.accessToken.refresh_token,
      };
      fetch(`${this._targetCell}__token`, {
        credentials: 'include',
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: composeFormBody(data),
      })
        .then(res => res.json())
        .then(jsonDat => {
          this._refreshAsync = null;
          authState.accessToken = jsonDat;
          resolve();
        })
        .catch(reject);
    }));
  }
}

class PersoniumLoginHandler {
  constructor(targetCell) {
    this._loginAsync = null;
    this._refreshAsync = null;
    this.boxUrl = null;
    this._targetCell = targetCell;
  }

  async loginAsync() {
    if (this._loginAsync !== null) {
      console.log('`loginAsync` is already started');
      return this._loginAsync;
    }

    console.log('`loginAsync` is started newly');
    return (this._loginAsync = new Promise((resolve, reject) => {
      fetch(`/__/auth/start_oauth2?cellUrl=${this._targetCell}`, {
        credentials: 'include',
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      })
        .then(res => res.json())
        .then(jsonDat => {
          this._loginAsync = null;
          authState.accessToken = jsonDat;
          return getBoxUrl(this._targetCell, jsonDat);
        })
        .then(boxUrl => {
          authState.boxUrl = boxUrl;
          console.log({ authState });
          resolve();
        })
        .catch(reject);
    }));
  }

  async refreshAsync() {
    if (this._refreshAsync !== null) {
      console.log('`refreshAsync` is already started');
      return this._refreshAsync;
    }

    console.log('`refreshAsync` is started newly');
    return (this._refreshAsync = new Promise((resolve, reject) => {
      const data = {
        refresh_token: authState.accessToken.refresh_token,
        p_target: this._targetCell,
      };
      fetch(`/__/auth/refreshProtectedBoxAccessToken`, {
        credentials: 'include',
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: composeFormBody(data),
      })
        .then(res => res.json())
        .then(jsonDat => {
          this._refreshAsync = null;
          authState.accessToken = jsonDat;
          resolve();
        })
        .catch(reject);
    }));
  }
}

export { PersoniumLoginROPC, PersoniumLoginHandler };
