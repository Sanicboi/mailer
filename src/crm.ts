import axios, {Axios, AxiosResponse} from "axios";

type CustomField = {
    field_id: 193951 | 193947;
    // field_name: 'NAZNACENIE' | 'NUMBER_PHONE';
    // code?: 'NUMBER_PHONE';
    // sort?: number;
    // type: string;
    values: Array<object>;
}

export interface IAddContact {
    name: string;
    first_name: string;
    last_name: string;
    responsible_user_id: number;
    created_by?: number;
    updated_by?: number;
    created_at?: number;
    updated_at?: number;
    custom_fields_values?: Array<CustomField>;
    tags_to_add?: Array<object>;
}

export interface IUpdateContact {
    id: number;
    name: string;
    first_name: string;
    last_name: string;
    responsible_user_id: number;
    created_by?: number;
    updated_by?: number;
    created_at?: number;
    updated_at?: number;
    custom_fields_values?: Array<CustomField>;
    tags_to_add?: Array<object>;
    tags_to_delete?: Array<object>;
}

export interface IContactResponse {
    name: string;
    first_name: string;
    last_name: string;
    responsible_user_id: number;
    group_id: number;
    created_by: number;
    updated_by: number;
    created_at: number;
    updated_at: number;
    is_deleted: boolean;
    closest_task_at: number;
    custom_fields_values: Array<CustomField>;
    account_id: number;
}

export interface ICreateDeal {
    name?: string;
    price?: number;
    status_id?: number;
    pipeline_id?: number;
    custom_fields_values?: CustomField[];
    tags_to_add?: {
        id?: number,
        name?: string
    }[]
}

export class AmoCrm {

    constructor() {
    }

    public async getContacts(): Promise<IContactResponse[]> {
        const res: AxiosResponse<{
            _page: number;
            _links: object;
            _embedded: {
                contacts: Array<IContactResponse>
            }
        }> = await axios.get('https://amocrm.ru/api/v4/contacts', {
            headers: {
                
            }
        });

        let arr: (IContactResponse)[] = []
        arr = arr.concat(res.data._embedded.contacts.map<IContactResponse>(el => {
            return {
                ...el
            }
        }));

        return arr;
    }

    public async getContact(id: string): Promise<IContactResponse> {
        const res: AxiosResponse<IContactResponse> = await axios.get(`https://amocrm.ru/api/v4/contacts/${id}`)
        return res.data
    }

    public async addContact(data: IAddContact): Promise<any> {
        const res = await axios.post('https://amocrm.ru/api/v4/contacts', data);
    }

    public async updateContact(data: IUpdateContact): Promise<any> {
        const res = await axios.patch('https://amocrm.ru/api/v4/contacts', data);
    }

    public async addDeal(data: ICreateDeal[]): Promise<{
        id: string
    }> {
        const res = await axios.post('https://plgmail.amocrm.ru/api/v4/leads', data, {
            headers: {
                Authorization: `Bearer ${process.env.AMO_TOKEN}`
            }
        });
        return res.data;
    }

    public async getCustomFields(): Promise<{
        _embedded: {
            custom_fields: unknown[]
        }
    }> {
        return (await axios.get('https://plgmail.amocrm.ru/api/v4/leads/custom_fields', {
            headers: {
                Authorization: `Bearer ${process.env.AMO_TOKEN}`
            }
        })).data;
    }

    public async getPipelines(): Promise<{
        _embedded: {
            pipelines: {
                id: number,
                name: string,
                _embedded: {
                    statuses: {
                        id: number,
                        name: string,
                    }[]
                }
            }[]
        }
    }> {
        return (await axios.get('https://plgmail.amocrm.ru/api/v4/leads/pipelines', {
            headers: {
                Authorization: `Bearer ${process.env.AMO_TOKEN}`
            }
        })).data;
    }


    public async getTags(): Promise<{
        _embedded: {
            tags: {
                id: number,
                name: string,
            }[]
        }
    }> {
        return (await axios.get('https://plgmail.amocrm.ru/api/v4/leads/tags', {
                        headers: {
                Authorization: `Bearer ${process.env.AMO_TOKEN}`
            }
        })).data;
    }

}