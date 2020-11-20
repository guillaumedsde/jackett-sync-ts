import axios from 'axios';
import { parse } from 'fast-xml-parser';
import { Indexer } from './models/indexer';
import { CategoryEntry, JackettEntry } from './interfaces/JackettEntry';
import { Config } from './config';

export class Jackett {
    url: string;
    apiKey: string;
    altUrl: string;
    requestUrl: string;

    parseOpts = {
        attributeNamePrefix: '',
        ignoreAttributes: false,
    };

    constructor() {
        const c = Config.jackett;

        this.url = c.url;
        this.altUrl = c.altUrl;
        this.apiKey = c.apiKey;

        this.requestUrl = `${this.url}/api/v2.0/indexers/all/results/torznab/api?apikey=${this.apiKey}&t=indexers&configured=true`;
    }

    async get(): Promise<Indexer[]> {
        const response = await axios.get(this.requestUrl);

        const parsedXML = parse(response.data, this.parseOpts);

        if (parsedXML.error) {
            throw new Error('Jackett: ' + parsedXML.error.description);
        }

        const indexers = parsedXML.indexers.indexer;

        return indexers.map((entry) => this.mapToIndexer(entry));
    }

    private static parseCategories(category: CategoryEntry[] | CategoryEntry): number[] {
        let categoryEntry = category;

        if (!Array.isArray(categoryEntry)) {
            categoryEntry = [categoryEntry];
        }

        const categories = [];

        categoryEntry.map((cat) => {
            categories.push(parseInt(cat.id));
            if (cat.subcat) {
                if (Array.isArray(cat.subcat)) {
                    cat.subcat.map((subCat) => {
                        categories.push(parseInt(subCat.id));
                    });
                } else {
                    categories.push(parseInt(cat.subcat.id));
                }
            }
        });

        return categories;
    }

    private mapToIndexer(entry: JackettEntry) {

        let categories = Jackett.parseCategories(entry.caps.categories.category);

        return new Indexer(
            entry.id,
            0,
            entry.title,
            'torrent',
            categories,
            0,
            `${this.altUrl || this.url}/api/v2.0/indexers/${entry.id}/results/torznab/`,
            this.apiKey,
        );
    }
}