import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { onSnapshot, query, updateDoc, deleteDoc, addDoc, increment, getDoc, getDocs, where } from 'firebase/firestore';
import { useTenant } from './TenantContext';
import { products as masterProducts } from '../data/products';

const InventoryContext = createContext({});

export const InventoryProvider = ({ children }) => {
    const { tCol, tDoc, setLoading, updateSyncTime, addAdminLog } = useTenant();
    const [items, setItems] = useState([]);
    const [recipes, setRecipes] = useState({});
    const [units, setUnits] = useState([]);

    /**
     * consumeMaterials: Deducts physical stock by increasing the 'sales' counter.
     */
    const consumeMaterials = useCallback(async (materials) => {
        try {
            for (const mat of materials) {
                const docRef = tDoc('products', mat.id);
                await updateDoc(docRef, {
                    sales: increment(Math.abs(mat.qtyToConsume))
                });
            }
            return { success: true };
        } catch (err) {
            console.error("Error consuming materials:", err);
            return { success: false, error: err.message };
        }
    }, [tDoc]);

    /**
     * loadFinishedGoods: Updates inventory for produced items and optionally consumes BOM materials.
     */
    const loadFinishedGoods = useCallback(async (sku, quantity, alreadyConsumed = false) => {
        try {
            const normalize = (str) => {
                if (!str) return '';
                return String(str)
                    .toLowerCase()
                    .normalize("NFD")
                    .replace(/[\u0300-\u036f]/g, "") // Remove accents
                    .trim();
            };

            const searchName = normalize(sku);
            const snapshot = await getDocs(tCol('products'));
            const docSnap = snapshot.docs.find(d => {
                const p = d.data();
                return normalize(p.name) === searchName || normalize(p.sku) === searchName;
            });

            if (docSnap) {
                const ptId = docSnap.id;
                await updateDoc(docSnap.ref, {
                    purchases: increment(Number(quantity) || 0)
                });

                if (!alreadyConsumed) {
                    const recipeList = recipes[ptId] || recipes[sku] || [];
                    if (recipeList.length > 0) {
                        const yieldQty = Number(recipeList[0].yield_quantity) || 1;
                        const materialsToConsume = recipeList.map(r => ({
                            id: r.rm_id,
                            qtyToConsume: (Number(r.qty) / yieldQty) * (Number(quantity) || 0)
                        }));
                        await consumeMaterials(materialsToConsume);
                    }
                }
                return { success: true };
            }
            throw new Error(`Producto [${sku}] no encontrado en el catálogo de productos.`);
        } catch (err) {
            console.error("Error loading finished goods:", err);
            return { success: false, error: err.message };
        }
    }, [recipes, consumeMaterials, tCol]);

    /**
     * auditStockAdjustment: Handles manual stock corrections with forced audit.
     */
    const auditStockAdjustment = useCallback(async (productId, newVal, reason, user) => {
        try {
            if (!user || (user.role !== 'admin' && user.role !== 'super_admin')) {
                throw new Error("No tienes permisos suficientes para realizar ajustes de stock.");
            }

            if (!reason || reason.trim().length < 5) {
                throw new Error("Debes proporcionar un motivo detallado para el ajuste.");
            }

            const productRef = tDoc('products', productId);
            const snap = await getDoc(productRef);
            if (!snap.exists()) throw new Error("Producto no encontrado.");
            
            const oldData = snap.data();
            const oldStock = (Number(oldData.stock || 0)) + (Number(oldData.purchases || 0)) - (Number(oldData.sales || 0));

            await updateDoc(productRef, {
                stock: Number(newVal),
                purchases: 0,
                sales: 0,
                updated_at: new Date().toISOString()
            });

            await addAdminLog('STOCK_ADJUSTMENT', {
                product_name: oldData.name,
                productId,
                old_stock: oldStock,
                new_stock: Number(newVal),
                reason: reason || 'Ajuste Manual'
            }, user);

            return { success: true };
        } catch (err) {
            console.error("Error in auditStockAdjustment:", err);
            return { success: false, error: err.message };
        }
    }, [addAdminLog, tDoc]);

    /**
     * Universal Unit Converter
     */
    const convertUnit = useCallback((value, from, to) => {
        if (!value || from === to) return Number(value);
        const siFactors = {
            'kg_gr': 1000, 'gr_kg': 0.001,
            'lt_ml': 1000, 'ml_lt': 0.001,
            'lb_gr': 500, 'gr_lb': 1 / 500,
            'lb_kg': 0.5, 'kg_lb': 2
        };
        const key = `${from}_${to}`;
        return siFactors[key] ? (Number(value) * siFactors[key]) : Number(value);
    }, []);

    const recalculatePTCosts = useCallback(async () => {
        if (!items || items.length === 0) return;
        console.log("Recalculating PT costs based on BOM...");
        const ptItems = items.filter(i => i.type === 'product' || i.category === 'Producto Terminado');

        const updates = ptItems.map(async (pt) => {
            const ptRecipe = recipes[pt.id] || [];
            if (ptRecipe.length === 0) return;

            let totalCost = 0;
            ptRecipe.forEach(ingredient => {
                const material = items.find(m => m.id === ingredient.rm_id || m.name === ingredient.name);
                if (material) {
                    const materialCost = Number(material.price || material.cost || material.avgCost) || 0;
                    const factor = Number(material.conversion_factor) || 1;
                    
                    let qtyInPurchaseUnit = ingredient.qty;
                    if (ingredient.unit !== material.purchase_unit) {
                        if (ingredient.unit === (material.unit_measure || material.unit)) {
                            qtyInPurchaseUnit = ingredient.qty / factor;
                        } else {
                            qtyInPurchaseUnit = convertUnit(ingredient.qty, ingredient.unit, material.purchase_unit);
                        }
                    }
                    totalCost += qtyInPurchaseUnit * materialCost;
                }
            });

            const yieldQty = ptRecipe.length > 0 ? (Number(ptRecipe[0].yield_quantity) || 1) : 1;
            const unitCost = totalCost / yieldQty;

            if (unitCost > 0) {
                try {
                    const docRef = tDoc('products', pt.id);
                    await updateDoc(docRef, {
                        recipe_cost: unitCost,
                        automated_cost: unitCost,
                        recipe_batch_cost: totalCost,
                        recipe_yield: yieldQty,
                        last_cost_recalc: new Date().toISOString(),
                        cost: unitCost
                    });
                } catch (err) {
                    console.error(`Error updating cost for ${pt.name}:`, err);
                }
            }
        });

        await Promise.all(updates);
        console.log("PT costs recalculation complete.");
    }, [items, recipes, convertUnit, tDoc]);

    const addItem = useCallback(async (data) => {
        try {
            const docRef = await addDoc(tCol('products'), { ...data, created_at: new Date().toISOString() });
            return { success: true, id: docRef.id };
        } catch (err) { return { success: false, error: err.message }; }
    }, [tCol]);

    const updateItem = useCallback(async (id, data) => {
        try {
            await updateDoc(tDoc('products', id), data);
            return { success: true };
        } catch (err) { return { success: false, error: err.message }; }
    }, [tDoc]);

    const deleteItem = useCallback(async (id) => {
        try {
            await deleteDoc(tDoc('products', id));
            return { success: true };
        } catch (err) { return { success: false, error: err.message }; }
    }, [tDoc]);

    // Subscriptions
    useEffect(() => {
        const unsubItems = onSnapshot(tCol('products'), (snapshot) => {
            const synchronizedItems = snapshot.docs.map(doc => {
                const p = doc.data();
                let price = Number(p.price) || 0;
                const pName = p.name ? String(p.name) : '';

                if (price === 0 && pName) {
                    const normalizedDbName = pName.toLowerCase().replace(/[^a-z0-9]/g, '');
                    const manualMappings = {
                        'vinagreta': 'vinagretamigalaba',
                        'antipastotuna': 'antipastoatunahumado',
                        'hummusdegarbanzo': 'hummusdegarbanzo'
                    };
                    const targetName = manualMappings[normalizedDbName] || normalizedDbName;
                    const masterMatch = masterProducts.find(mp =>
                        String(mp.nombre || '').toLowerCase().replace(/[^a-z0-9]/g, '') === targetName
                    );
                    if (masterMatch) price = Number(masterMatch.precio) || 0;
                }
                return {
                    ...p,
                    id: doc.id,
                    name: pName,
                    type: p.type === 'PT' ? 'product' : 'material',
                    initial: Number(p.stock) || 0,
                    safety: Number(p.min_stock_level) || 0,
                    avgCost: Number(p.cost) || 0,
                    price: price
                };
            });
            setItems(synchronizedItems);
            setLoading(false);
            updateSyncTime();
        }, (error) => console.error("Snapshot Products Error:", error));

        const unsubRecipes = onSnapshot(tCol('recipes'), (snapshot) => {
            const groupedRecipes = {};
            snapshot.docs.forEach(doc => {
                const r = doc.data();
                const fgId = r.finished_good_id;
                const fgName = (r.finished_good_name || '').toLowerCase().trim();
                if (!fgId && !fgName) return;

                const recipeItem = {
                    ...r,
                    id: doc.id,
                    rm_id: r.raw_material_id,
                    name: r.raw_material_name,
                    sku: r.raw_material_sku,
                    qty: r.input_qty !== undefined ? r.input_qty : r.quantity_required,
                    unit: r.input_unit || r.unit || 'und',
                    finished_good_id: fgId,
                    finished_good_name: r.finished_good_name,
                    yield_quantity: Number(r.yield_quantity) || 1
                };

                if (fgId) {
                    if (!groupedRecipes[fgId]) groupedRecipes[fgId] = [];
                    groupedRecipes[fgId].push(recipeItem);
                }
                if (fgName) {
                    if (!groupedRecipes[fgName]) groupedRecipes[fgName] = [];
                    groupedRecipes[fgName].push(recipeItem);
                }
            });
            setRecipes(groupedRecipes);
            updateSyncTime();
        }, (error) => console.error("Snapshot Recipes Error:", error));

        const unsubUnits = onSnapshot(tCol('units'), (snapshot) => {
            setUnits(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })));
            updateSyncTime();
        }, (error) => console.error("Snapshot Units Error:", error));

        return () => {
            unsubItems();
            unsubRecipes();
            unsubUnits();
        };
    }, [tCol, setLoading, updateSyncTime]);

    const value = {
        items,
        recipes,
        units,
        consumeMaterials,
        loadFinishedGoods,
        auditStockAdjustment,
        convertUnit,
        recalculatePTCosts,
        addItem,
        updateItem,
        deleteItem
    };

    return (
        <InventoryContext.Provider value={value}>
            {children}
        </InventoryContext.Provider>
    );
};

export const useInventory = () => useContext(InventoryContext);
