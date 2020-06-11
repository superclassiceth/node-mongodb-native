enum Aspect {
  'READ_OPERATION' = 'READ_OPERATION',
  'WRITE_OPERATION' = 'WRITE_OPERATION',
  'RETRYABLE' = 'RETRYABLE',
  'EXECUTE_WITH_SELECTION' = 'EXECUTE_WITH_SELECTION',
};

/**
 * This class acts as a parent class for any operation and is responsible for setting this.options,
 * as well as setting and getting a session.
 * Additionally, this class implements `hasAspect`, which determines whether an operation has
 * a specific aspect.
 */
abstract class OperationBase {
  options: any
  aspects: any
  constructor(options: any) {
    this.options = Object.assign({}, options);
  }

  hasAspect(aspect: any) {
    // @ts-ignore
    if (this.constructor.aspects == null) {
      return false;
    }
    // @ts-ignore
    return this.constructor.aspects.has(aspect);
  }

  set session(session) {
    Object.assign(this.options, { session });
  }

  get session() {
    return this.options.session;
  }

  clearSession() {
    delete this.options.session;
  }

  get canRetryRead() {
    return true;
  }

  abstract execute(server: any, callback: any): any
}

function defineAspects(operation: new (...args: any) => any, aspects: Aspect | Aspect[]) {
  if (!Array.isArray(aspects)) {
    aspects = [aspects];
  }
  Object.defineProperty(operation, 'aspects', {
    value: new Set(aspects),
    writable: false
  });
  return aspects;
}

export {
  Aspect,
  defineAspects,
  OperationBase
};
