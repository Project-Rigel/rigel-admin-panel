import { ChangeDetectionStrategy, Component, EventEmitter, Input, OnInit, Output, ViewChild } from "@angular/core";
import { IonInfiniteScroll } from "@ionic/angular";
import { Subscription } from "rxjs";
import { Product } from "../../../interfaces/product";
import { ProductsService } from "../../../services/products.service";

@Component({
  selector: "app-products-list",
  templateUrl: "./products-list.component.html",
  styleUrls: ["./products-list.component.scss"],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProductsListComponent implements OnInit {
  @ViewChild(IonInfiniteScroll, { static: false })
  public ionInfiniteScrollElement: IonInfiniteScroll;

  @Input() loadedData: Product[];
  @Input() loading: boolean;
  @Input() done: boolean;
  @Input() isSearching: boolean;
  @Input() searchResult: Product[];
  @Input() maxHeightPercent = 80;
  @Input() isSelectable: boolean;

  @Output() onProductClicked: EventEmitter<Product> = new EventEmitter<
    Product
  >();

  subscriptions: Subscription[];
  lastIdSelected: string;
  isLoadingProducts = true;

  constructor(private productService: ProductsService) {
    this.subscriptions = [];
    this.lastIdSelected = '';
  }

  ngOnInit() {
    this.subscriptions.push(
      this.productService.done.subscribe(done => {
        if (done === true) {
          this.isLoadingProducts = false;
          if (this.ionInfiniteScrollElement) {
            this.ionInfiniteScrollElement.disabled = true;
          }
        }
      }),
    );

    this.subscriptions.push(
      this.productService.loading.subscribe(async loading => {
        if (this.isLoadingProducts === false) {
          this.isLoadingProducts = loading;
        }
        if (!loading && this.ionInfiniteScrollElement) {
          await this.ionInfiniteScrollElement.complete();
        }
      }),
    );
  }

  ngOnDestroy() {
    if (this.subscriptions) {
      this.subscriptions.forEach(sub => sub.unsubscribe());
    }
    // Reset para que si se cierra el modal y se vuelve a entrar la lista contenga solo los primeros 15 elementos.
    this.productService.reset();
  }

  selectProduct(event) {
    if (event.id === this.lastIdSelected) {
      this.onProductClicked.emit(null);
      this.lastIdSelected = '';
    } else {
      this.onProductClicked.emit(event);
      this.lastIdSelected = event.id;
    }
  }

  loadData(event) {
    this.productService.more();
  }
}
