import axios, {Axios, AxiosResponse} from "axios";

type CustomField = {
    field_id: number;
    field_name: string;
    code?: string;
    sort?: number;
    type: string;
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

export class AmoСrm {

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

    public async AddContact(data: IAddContact): Promise<any> {
        const res = await axios.post('https://amocrm.ru/api/v4/contacts', data);
    }

    public async UpdateContact(data: IUpdateContact): Promise<any> {
        const res = await axios.patch('https://amocrm.ru/api/v4/contacts', data);
    }
}