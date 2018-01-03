import {Filter, Where} from '@loopback/repository';
import {inject} from '@loopback/context';
import {<%= modelName %>} from '../models';
import {<%= repositoryName %>} from '../repositories';

export class <%= name %>Controller {

  constructor(
    @inject('repositories.<%= modelNameCamel %>')
    public <%= repositoryNameCamel %> : <%= repositoryName %>,
  ) {}
  async create(obj: <%= modelName %>) : Promise<<%= modelName %>> {
    return await this.<%= repositoryNameCamel %>.create(obj);
  }

  async count(where: Where) : Promise<number> {
    return await this.<%= repositoryNameCamel %>.count(where);
  }

 async find(filter: Filter) : Promise<<%= modelName %>[]> {
    return await this.<%= repositoryNameCamel %>.find(filter);
  }

  async updateAll(where: Where, obj: <%= modelName %>) : Promise<number> {
    return await this.<%= repositoryNameCamel %>.updateAll(where, obj);
  }

  async deleteAll(where: Where) : Promise<number> {
    return await this.<%= repositoryNameCamel %>.deleteAll(where);
  }

  async findById(id: <%= idType %>) : Promise<<%= modelName %>> {
    return await this.<%= repositoryNameCamel %>.findById(id);
  }

  async updateById(id: <%= idType %>, obj: <%= modelName %>) : Promise<boolean> {
    return await this.<%= repositoryNameCamel %>.updateById(id, obj);
  }

  async deleteById(id: <%= idType %>) : Promise<boolean> {
    return await this.<%= repositoryNameCamel %>.deleteById(id);
  }
}
