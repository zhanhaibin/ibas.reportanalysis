/**
 * @license
 * Copyright color-coding studio. All Rights Reserved.
 *
 * Use of this source code is governed by an Apache License, Version 2.0
 * that can be found in the LICENSE file at http://www.apache.org/licenses/LICENSE-2.0
 */

import * as ibas from "ibas/index";
import * as bo from "../../borep/bo/index";
import { IReportViewer } from "./Report.d";
import { BORepositoryReportAnalysis } from "../../borep/BORepositories";

/** 查看应用-报表 */
export abstract class ReportViewApp<T extends IReportViewView> extends ibas.Application<T> implements IReportViewer {

    /** 构造函数 */
    constructor() {
        super();
    }
    /** 注册视图 */
    protected registerView(): void {
        super.registerView();
        // 其他事件
        this.view.runReportEvent = this.runReport;
    }
    /** 视图显示后 */
    protected viewShowed(): void {
        // 视图加载完成
        if (ibas.objects.isNull(this.report.parameters)
            || this.report.parameters.firstOrDefault((item: bo.UserReportParameter) => {
                if (item.category !== bo.emReportParameterType.PRESET) {
                    return true;
                }
            }) === null) {
            // 没有参数的报表，直接运行
            this.runReport();
        } else {
            // 有参数报表
            // 设置系统变量值
            for (let item of this.report.parameters) {
                if (item.category === bo.emReportParameterType.SYSTEM) {
                    item.value = ibas.variablesManager.getValue(item.value);
                }
            }
            // 显示信息
            this.view.showReport(this.report);
        }
    }
    /** 运行,覆盖原方法 */
    run(...args: any[]): void {
        try {
            if (ibas.objects.instanceOf(this.report, bo.UserReport)) {
                super.run();
                return;
            } else if (arguments.length === 1) {
                let report: bo.UserReport = arguments[0];
                if (ibas.objects.instanceOf(report, bo.UserReport)) {
                    this.report = report;
                    this.description = ibas.strings.format("{0} - {1}", this.description, this.report.name);
                    super.run();
                    return;
                }
            }
            throw new Error(ibas.i18n.prop("reportanalysis_run_report_error"));
        } catch (error) {
            this.messages(error);
        }
    }
    report: bo.UserReport;
    runReport(): void {
        let that: this = this;
        let boRepository: BORepositoryReportAnalysis = new BORepositoryReportAnalysis();
        boRepository.runUserReport({
            report: this.report,
            onCompleted(opRslt: ibas.IOperationResult<ibas.DataTable>): void {
                try {
                    that.busy(false);
                    if (opRslt.resultCode !== 0) {
                        throw new Error(opRslt.message);
                    }
                    let table: ibas.DataTable = opRslt.resultObjects.firstOrDefault();
                    if (ibas.objects.isNull(table)) {
                        throw new Error(ibas.i18n.prop("reportanalysis_report_no_data"));
                    }
                    that.view.showResults(table);
                } catch (error) {
                    that.messages(error);
                }
            }
        });
        this.busy(true);
        this.proceeding(ibas.emMessageType.INFORMATION, ibas.i18n.prop("reportanalysis_running_report", this.report.name));
    }
}
/** 视图-报表 */
export interface IReportViewView extends ibas.IView {
    /** 运行报表 */
    runReportEvent: Function;
    /** 显示报表 */
    showReport(report: bo.UserReport): void;
    /** 显示报表结果 */
    showResults(table: ibas.DataTable): void;
}