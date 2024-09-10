import { useState, useEffect, ReactNode } from "react";
import { saveCart, getCart, getProductsByIds } from "../api";
import MemoizedLoading from "../loader";
import { withUser } from "../withProvider";
import { CartContext } from "../Contexts";

// Define types for props
interface CartProviderProps {
  isLoggedIn: boolean;
  children: ReactNode;
  setAlert: (message: string) => void;
}

function CartProvider({ isLoggedIn, children }: CartProviderProps) {
  const [cart, setCart] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    setLoading(true);
    if (isLoggedIn) {
      getCart().then((cartData) => {
        setCart(cartData);
        setLoading(false);
      });
    } else {
      const savedData = JSON.parse(localStorage.getItem("cart") || "{}");
      const productIds = Object.keys(savedData).map(id => parseInt(id, 10)); // Convert IDs to numbers

      getProductsByIds(productIds).then((products) => {
        const savedCart = products.map((p) => ({
          product: p,
          quantity: savedData[p.id],
        }));
        setCart(savedCart);
        setLoading(false);
      });
    }
  }, [isLoggedIn]);

  function updateCart(newCart: any[]) {
    setCart(newCart);
    setDirty(false);

    const cartObject = newCart.reduce<{ [key: string]: number }>((acc, curr) => {
      return { ...acc, [curr.product.id]: curr.quantity };
    }, {});

    if (!isLoggedIn) {
      const cartString = JSON.stringify(cartObject);
      localStorage.setItem("cart", cartString);
    } else {
      saveCart(cartObject);
    }
  }

  function addToCart(productId: number, newCount: number) {
    const newCart = [...cart];
    const product = newCart.find((p) => p.product.id === productId);

    if (!isLoggedIn) {
      if (product) {
        product.quantity = newCount;
        updateCart(newCart);
        localStorage.setItem("cart", JSON.stringify(newCart));
      } else {
        getProductsByIds([productId]).then((products) => {
          newCart.push({
            product: products[0],
            quantity: newCount,
          });
          updateCart(newCart);
        });
      }
    } else {
      getProductsByIds([productId]).then((products) => {
        if (product) {
          product.quantity = newCount;
        } else {
          newCart.push({
            product: products[0],
            quantity: newCount,
          });
        }

        const cartObject = newCart.reduce<{ [key: string]: number }>((acc, curr) => {
          return { ...acc, [curr.product.id]: curr.quantity };
        }, {});

        updateCart(newCart);
        saveCart(cartObject);
      });
    }
  }

  function removeFromCart(productId: number) {
    const newCart = cart.filter((item) => item.product.id !== productId);
    updateCart(newCart);
  }

  function handleChange(newVal: number, productId: number) {
    setDirty(true);
    const newCart = cart.map((item) => {
      if (item.product.id === productId) {
        return { ...item, quantity: newVal };
      }
      return item;
    });
    updateCart(newCart);
  }

  const countCart = cart.reduce((prev, curr) => prev + curr.quantity, 0);

  if (loading) {
    return <MemoizedLoading />;
  }

  return (
    <CartContext.Provider
      value={{
        cart,
        countCart,
        updateCart,
        addToCart,
        removeFromCart,
        handleChange,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export default withUser(CartProvider);