import axios, { Axios, AxiosResponse } from "axios";

type CustomField = {
  field_id: 193951 | 758239 | 758241;
  values: {
    value: string;
  }[];
};

export interface ICreateDeal {
  name?: string;
  price?: number;
  status_id: 77868898;
  pipeline_id: 9442090;
  custom_fields_values?: CustomField[];
  tags_to_add?: {
    id?: number;
    name?: string;
  }[];
}

class AmoCrm {
  constructor() {}

  public async addDeal(data: ICreateDeal[]): Promise<{
    id: number
  }> {
    const res: AxiosResponse<{
    _embedded: {
      leads: [{
        id: number
      }]
    }
  }> = await axios.post(
      "https://plgmail.amocrm.ru/api/v4/leads",
      data,
      {
        headers: {
          Authorization: `Bearer ${process.env.AMO_TOKEN}`,
        },
      },
    );
    return res.data._embedded.leads[0];
  }

  public async editDeal(data: {
    id: number;
    /**
     * China/Not China/Not WB/Unknown
     */
    status_id: 77868902 | 77868906 | 77868910 | 77868898;
    custom_fileds_values: {
      field_id: 758239;
      values: {
        value: string;
      }[];
    }[];
  }) {
    await axios.patch("https://plgmail.amocrm.ru/api/v4/leads", {
      headers: {
        Authorization: `Bearer ${process.env.AMO_TOKEN}`,
      },
    });
  }

  public async getCustomFields(): Promise<{
    _embedded: {
      custom_fields: {
        id: number;
        name: string;
        type: string;
      }[];
    };
  }> {
    return (
      await axios.get("https://plgmail.amocrm.ru/api/v4/leads/custom_fields", {
        headers: {
          Authorization: `Bearer ${process.env.AMO_TOKEN}`,
        },
      })
    ).data;
  }

  public async getPipelines(): Promise<{
    _embedded: {
      pipelines: {
        id: number;
        name: string;
        _embedded: {
          statuses: {
            id: number;
            name: string;
          }[];
        };
      }[];
    };
  }> {
    return (
      await axios.get("https://plgmail.amocrm.ru/api/v4/leads/pipelines", {
        headers: {
          Authorization: `Bearer ${process.env.AMO_TOKEN}`,
        },
      })
    ).data;
  }

  public async getTags(): Promise<{
    _embedded: {
      tags: {
        id: number;
        name: string;
      }[];
    };
  }> {
    return (
      await axios.get("https://plgmail.amocrm.ru/api/v4/leads/tags", {
        headers: {
          Authorization: `Bearer ${process.env.AMO_TOKEN}`,
        },
      })
    ).data;
  }

  public getStatusId(tag: 'china' | 'not-china' | 'not-wb' | 'unclear'): 77868902 | 77868906 | 77868910 | 77868898 {
    switch (tag) {
      case 'china':
        return 77868902;
      case 'not-china':
        return 77868906;
      case 'not-wb':
        return 77868910;
      case 'unclear':
        return 77868898;
    }
  }
}

export const amo = new AmoCrm();
