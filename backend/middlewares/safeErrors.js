/**
 * Last line of defence for error responses: removes stack traces and replaces
 * internal error text (database / runtime errors) with a plain message, so
 * users never see things like "Invalid `prisma.order.create()` invocation".
 * Messages written for users ("Insufficient stock for …") pass through.
 */
const INTERNAL = /prisma|invocation|invalid `|constraint|foreign key|column|ECONN|ETIMEDOUT|ENOTFOUND|socket|TypeError|ReferenceError|Cannot read|is not a function|is not defined|undefined|Unexpected token|JSON|SQL|\n/i;
const FRIENDLY = 'Something went wrong. Please try again.';

const clean = (value) => (typeof value === 'string' && INTERNAL.test(value) ? FRIENDLY : value);

export default function safeErrors(req, res, next) {
  const json = res.json.bind(res);
  res.json = (body) => {
    if (res.statusCode >= 400 && body && typeof body === 'object' && !Array.isArray(body)) {
      const { stack, ...rest } = body;
      if ('error' in rest) rest.error = clean(rest.error);
      if ('message' in rest) rest.message = clean(rest.message);
      return json(rest);
    }
    return json(body);
  };
  next();
}
