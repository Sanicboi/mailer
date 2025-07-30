import axios, { Axios, AxiosResponse } from "axios";

export enum CustomFieldID {
  Phone = 193951,
  Username = 758241,
  Dialog = 759347,
  INN = 759493,
}

export enum StatusID {
  China = 77868902,
  NotChina = 77868906,
  NotWB = 77868910,
  Unknown = 77868898,
}

type CustomField = {
  field_id: CustomFieldID;
  values: {
    value: string;
  }[];
};

export interface ICreateDeal {
  name?: string;
  price?: number;
  status_id: StatusID;
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
    id: number;
  }> {
    const res: AxiosResponse<{
      _embedded: {
        leads: [
          {
            id: number;
          },
        ];
      };
    }> = await axios.post("https://plgmail.amocrm.ru/api/v4/leads", data, {
      headers: {
        Authorization: `Bearer ${process.env.AMO_TOKEN}`,
      },
    });
    return res.data._embedded.leads[0];
  }

  public async editDeal(data: {
    id: number;
    status_id: StatusID;
    custom_fields_values: CustomField[];
  }) {
    await axios.patch(`https://plgmail.amocrm.ru/api/v4/leads/${data.id}`, data, {
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

  public async getLeads(): Promise<
    {
      id: number;
      name: string;
      status_id: StatusID;
      pipeline_id: 9442090;
      custom_fields_values: CustomField[] | null;
    }[]
  > {
    let result: {
      id: number;
      name: string;
      status_id: StatusID;
      pipeline_id: 9442090;
      custom_fields_values: CustomField[] | null;
    }[] = [];
    let r: {
      _links: {
        next?: {
          href: string;
        };
      };
      _embedded: {
        leads: {
          id: number;
          name: string;
          status_id: StatusID;
          pipeline_id: 9442090;
          custom_fields_values: CustomField[] | null;
        }[];
      };
    } = (
      await axios.get("https://plgmail.amocrm.ru/api/v4/leads?limit=250", {
        headers: {
          Authorization: `Bearer ${process.env.AMO_TOKEN}`,
        },
      })
    ).data;
    result = result.concat(r._embedded.leads);
    while (r._links.next && r._links.next.href) {
      r = (
        await axios.get(r._links.next.href, {
          headers: {
            Authorization: `Bearer ${process.env.AMO_TOKEN}`,
          },
        })
      ).data;
      result = result.concat(r._embedded.leads);
    }
    return result;
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

  public getStatusId(
    tag: "china" | "not-china" | "not-wb" | "unknown",
  ): StatusID {
    switch (tag) {
      case "china":
        return StatusID.China;
      case "not-china":
        return StatusID.NotChina;
      case "not-wb":
        return StatusID.NotWB;
      case "unknown":
        return StatusID.Unknown;
    }
  }
}

export const amo = new AmoCrm();
