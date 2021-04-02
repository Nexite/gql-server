import { verify } from 'jsonwebtoken';

export const scopes = {
  readUsers: 'read:users',
  writeUsers: 'write:users',
  readUserRoles: 'read:users',
  readBlogUnpublished: 'read:blog_unpublished',
};

export const hasScope = (ctx, scope) => (ctx.scopes || []).includes(scope)

export const hasAnyOfScopes = (ctx, requiredScopes) => {
  requiredScopes = requiredScopes.filter(Boolean);
  if (!requiredScopes.reduce((accum, scope) => accum || hasScope(ctx, scope), false)) {
    return false;
  }
  return true
};

export const requireAnyOfScopes = (ctx, requiredScopes) => {
  requiredScopes = requiredScopes.filter(Boolean);
  if (!requiredScopes.reduce((accum, scope) => accum || hasScope(ctx, scope), false)) {
    if (requiredScopes.length == 1) throw new Error(`Your request requires the scope ${requiredScopes.join('')}.`);
    throw new Error(`Your request requires one of the scopes: ${requiredScopes.join(', ')}.`);
  }
  return true;
};
export const requireScope = (ctx, scope) => {
  if (!hasScope(ctx, scope)) {
    throw new Error(`Your request requires the scope ${scope}.`);
  }
  return true;
};

export const addAuthContext = (req) => {
  if (!req) return { scopes: [] };
  const { headers } = req;
  if ((!headers || !('authorization' in headers) || !headers.authorization) && !req.header("Account-Authorization")) return { scopes: [] };
  const [authType, token] = headers.authorization ? headers.authorization.split(/\s+/) : req.header("Account-Authorization").split(/\s+/);

  if (authType !== 'Bearer' || !token) return { scopes: [] };

  if (headers.authorization) {
    const { scopes: grantedScopes } = verify(token, process.env.TOKEN_SECRET);
    return { scopes: grantedScopes.split(/\s+/g) };
  } else if (req.header("Account-Authorization")) {
    const { id: user } = verify(token, process.env.AUTH0_HOOK_SHARED_SECRET)
    if (user == null) return { scopes: [] }
    return { user, scopes: [`write:user:${user}`, `read:user:${user}`] }
  }
};

export const addWsAuthContext = (connectionParams) => {
  if (!connectionParams.authorization) return { scopes: [] };
  
  const [authType, token] = connectionParams.authorization.split(/\s+/);
  if (authType !== 'Bearer' || !token) return { scopes: [] };

  const { scopes: grantedScopes } = verify(token, process.env.TOKEN_SECRET)
  return { scopes: grantedScopes.split(/\s+/g) };
};
