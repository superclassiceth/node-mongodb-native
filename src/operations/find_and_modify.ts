import * as Collection from '../collection';
import * as server from '../sdam/server';
import * as command from './command_v2';
import * as operation from './operation';
import * as utils from '../utils';
import * as error from '../error'

const { Server } = server;
const { maxWireVersion, formattedOrderClause } = utils;
const { MongoError } = error;
const { CommandOperationV2 } = command;
const { Aspect, defineAspects } = operation;

interface FindAndModifyOptions {
  new: boolean,
  remove: boolean,
  upsert: boolean,
  w: number | string,
  projection: any,
  fields: any,
  arrayFilters: any,
  maxTimeMS: number,
  serializeFunctions: boolean,
  bypassDocumentValidation: true,
  hint: boolean
}

class FindAndModifyOperation extends CommandOperationV2 {
  collection: Collection
  query: any
  sort: any
  doc: any

  constructor(
    collection: Collection,
    query: any,
    sort: any,
    doc: any,
    options: FindAndModifyOptions
  ) {
    super(collection, options);

    this.collection = collection;
    this.query = query;
    this.sort = sort;
    this.doc = doc;
  }

  execute(server: typeof Server, callback: (err: Error | null, result?: any) => any) {
    const coll = this.collection;
    const query = this.query;
    const sort = formattedOrderClause(this.sort);
    const doc = this.doc;
    const options = this.options;
    const wireVersion = maxWireVersion(server);
    const unacknowledgedWrite = this.writeConcern && this.writeConcern.w === 0;

    // Create findAndModify command object
    const queryObject: any = {
      findAndModify: coll.collectionName,
      query: query
    };

    if (sort) {
      queryObject.sort = sort;
    }

    queryObject.new = options.new ? true : false;
    queryObject.remove = options.remove ? true : false;
    queryObject.upsert = options.upsert ? true : false;

    const projection = options.projection || options.fields;

    if (projection) {
      queryObject.fields = projection;
    }

    if (options.arrayFilters) {
      queryObject.arrayFilters = options.arrayFilters;
    }

    if (doc && !options.remove) {
      queryObject.update = doc;
    }

    if (options.maxTimeMS) queryObject.maxTimeMS = options.maxTimeMS;

    // Either use override on the function, or go back to default on either the collection
    // level or db
    this.options.serializeFunctions = options.serializeFunctions || coll.s.serializeFunctions;

    // No check on the documents
    this.options.checkKeys = false;

    // forces writeConcern for find and modify regardless of maxWireVersion
    if (this.writeConcern) queryObject.writeConcern = this.writeConcern;

    // Have we specified bypassDocumentValidation
    if (options.bypassDocumentValidation === true) {
      queryObject.bypassDocumentValidation = true;
    }

    if (options.hint) {
      if (unacknowledgedWrite || wireVersion < 8) {
        callback(
          new MongoError('The current server does not support a hint on findAndModify commands')
        );

        return;
      }

      queryObject.hint = options.hint;
    }

    // Execute the command
    Object.freeze(this.options);
    return super.executeCommand(server, queryObject, callback);
  }
}

defineAspects(FindAndModifyOperation, [
  Aspect.WRITE_OPERATION,
  Aspect.READ_OPERATION,
  Aspect.RETRYABLE,
  Aspect.EXECUTE_WITH_SELECTION
]);

module.exports = FindAndModifyOperation;
