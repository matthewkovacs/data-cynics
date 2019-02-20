Machine Learning Pipelines with Caret
================

This notebook will provide a detailed example of how what a traditional
machine learning pipeline looks like in R using the `caret` package for
hyperparameter optimization.

For practice, we will fit a classifier to predict the probability of
loan default for a bank’s customers. We will use the `wakefield` package
to generate this dataset that we will fit multiple classifiers to and
evaluate which model is the best.

## 1\. Create Dataset

First we need to import the packages that we will use throughout this
notebook.

``` r
library(wakefield)
library(dplyr)
library(DataExplorer)
library(mice)
library(caret)
library(gencve)
```

We will generate a dataset and set roughly 20% of the data to missing.
This is done to simulate a real life dataset, as they are rarely ever
complete. Datasets with missing values are a reality that every data
scientist must deal with.

As unfortunate as that may be, it gives us the opportunity to use some
sophisticated data imputation algorithms, like we will use here.

``` r
raw_data <- r_data_frame(n = 500,
                         id,
                         age(x = 18:100),
                         sex,
                         education_lvl = sample(1:4, n, replace = TRUE),
                         marital_status = sample(1:3, n, replace = TRUE),
                         credict_score = rnorm(mean = 687, sd = 69),
                         bill_amount1 = rnorm(mean = 612, sd = 300),
                         bill_amount2 = rnorm(mean = 587, sd = 256),
                         bill_amount3 = rnorm(mean = 621, sd = 312),
                         pay_delay_months1 = sample(0:4, n, replace = TRUE),
                         pay_delay_months2 = sample(0:5, n, replace = TRUE),
                         pay_delay_months3 = sample(0:5, n, replace = TRUE),
                         default_occurred = dummy
                         #default_occurred = sample(c('no', 'yes'), n, replace = TRUE)
) %>% r_na(prob = 0.2)
```

## 2\. Data Cleaning

We should check our data for missing
values.

``` r
plot_missing(raw_data)
```

![](ML-categorical-classifier_files/figure-gfm/unnamed-chunk-4-1.png)<!-- -->

Just as we had asked, 20% of each feature is missing from our data. This
then justifies the need for data imputation as a cleaning step within
our pipeline.

Imputation is valid here because we know that our data is missing
completely at random (MCAR). In other words, the mechanism for
missingness in our data has nothing to do with any bias within our data
set. The missigness of the data is independent of the data.

### A. Choosing an Imputation Algorithm

The MICE algorithm is probably the most robust method available to
impute missing data. MICE is an acronymn for “Multiple Imputation using
Chained Equations”. This an adaptive approach to data imputation that
will choose different imputation algorithms depending on the data type
of the feature being imputed.

Continuous features will be imputed using the *predictive mean matching*
algorithm. Binary features will be imputated using a *logistic
regression*. And categorical variables will be imputed using a
*Multivariate logistic regression*.

All of the imputation agorithms utilized by MICE are based on Bayesian
statistical theory, which should put concerned statisticians’ minds at
ease.

### B. Performing our Imputation

The `MICE` package can help us clean our data.

``` r
# Remove the ID column before imputing
raw_data <- select(raw_data, -c(ID))

# Use MICE w/ five imputation passes
guess_missing <- mice(raw_data, printFlag = FALSE)

# Select the final (fifth) imputation pass as our imputed dataset
imputed_data <- complete(guess_missing, 5)
```

A quick check to ensure that MICE cleaned our missing values by imputing
them:

``` r
plot_missing(imputed_data)
```

![](ML-categorical-classifier_files/figure-gfm/unnamed-chunk-6-1.png)<!-- -->

Success never felt so good.

### 3\. Exploratory Data Analysis

Let’s perform some quick exploratory data analysis to get an idea of
what this dataset looks like.

``` r
# Set categorical variables as factors within our dataframe
cat_var_vector <- c('education_lvl', 'default_occurred', 'marital_status')
imputed_data <- imputed_data %>% mutate_at(cat_var_vector, funs(factor(.)))
```

    ## Warning: funs() is soft deprecated as of dplyr 0.8.0
    ## please use list() instead
    ## 
    ## # Before:
    ## funs(name = f(.)
    ## 
    ## # After: 
    ## list(name = ~f(.))
    ## This warning is displayed once per session.

``` r
# Decode depdendent variable
imputed_data <- imputed_data %>% 
  mutate(default_occurred = factor(
    ifelse(
      default_occurred == 0, 'no', 'yes')
    ))

# Visualize all categorical/binary features
plot_bar(imputed_data)
```

![](ML-categorical-classifier_files/figure-gfm/unnamed-chunk-7-1.png)<!-- -->

Our dependent variable `default_occurred` appears to be balanced between
the two values. Therefore, we won’t need to oversample this feature as a
pre-processing step.

``` r
# Visualize all continuous variables
plot_histogram(imputed_data)
```

![](ML-categorical-classifier_files/figure-gfm/unnamed-chunk-8-1.png)<!-- -->

Most of these curves appear to be either normal or logistic
distributions.

### 4\. Pre-processing

We should split our imputed dataset into train and test components
before fitting our models.

``` r
# Decode dependent variable factor levels to either "yes" or "no"
levels(imputed_data$default_occurred) <- c('no', 'yes')

idx <- createDataPartition(imputed_data$default_occurred, 
                           p = 0.8, 
                           list = FALSE, 
                           times = 1)

training_data <- imputed_data[idx, ]
test_data <- imputed_data[-idx, ]
```

### 4\. Model Training

We should elect to train our model using minimized logarithmic loss as
our optimization algorithm. This is because log loss will punish models
for predicting wrong answers with high confidence, which is exactly what
our use case calls for.

#### A. Logistic Regression

Let’s use `caret` to fit the fan-favorite logistic regression to our
dataset. We will use 10-fold cross-validation to help mitigate
overfitting.

``` r
# Setup training parameters using Log Loss
logistic_control <- trainControl(method = 'cv',
                                 number = 10,
                                 classProbs = TRUE,
                                 summaryFunction = mnLogLoss,
                                 allowParallel = TRUE)

# Fit the classifier to the data
logistic_fit <- train(default_occurred ~ .,
                      data=training_data,
                      method='glm',
                      family='binomial',
                      trControl=logistic_control,
                      metric = "logLoss")
```

Our logistic regression model is now trained and we can test it’s
ability to predict the correct dependent variable value.

``` r
logistic_predict <- predict(logistic_fit, newdata=test_data)
gencve::logloss(test_data$default_occurred, logistic_predict)
```

    ## [1] 67.42823

The logloss number can be used to benchmark the efficacy of one model
against another, similar to how the mean squared error value is used to
pick the best model.

Next, the confusion matrix can be generated to check the accuracy of the
model.

``` r
confusionMatrix(table(logistic_predict, test_data$default_occurred))
```

    ## Confusion Matrix and Statistics
    ## 
    ##                 
    ## logistic_predict no yes
    ##              no  22  21
    ##              yes 24  32
    ##                                           
    ##                Accuracy : 0.5455          
    ##                  95% CI : (0.4423, 0.6459)
    ##     No Information Rate : 0.5354          
    ##     P-Value [Acc > NIR] : 0.4608          
    ##                                           
    ##                   Kappa : 0.0824          
    ##  Mcnemar's Test P-Value : 0.7656          
    ##                                           
    ##             Sensitivity : 0.4783          
    ##             Specificity : 0.6038          
    ##          Pos Pred Value : 0.5116          
    ##          Neg Pred Value : 0.5714          
    ##              Prevalence : 0.4646          
    ##          Detection Rate : 0.2222          
    ##    Detection Prevalence : 0.4343          
    ##       Balanced Accuracy : 0.5410          
    ##                                           
    ##        'Positive' Class : no              
    ## 

In this case the accuracy of our model performs no better than flipping
a coin. This is what is scientifically known as “garbage accuracy.”

Q: Why is our accuracy so low?

A: Remember that we generated this dataset at the beginning of this
exercise. The data we created does not have the statistical phenomena
that is represented in real life data. In effect, we are evaluating how
well our models fit to random noise.

Q: Why bother doing this then?

A: This notebook is a *how to* example of what a typical machine
learning pipeline looks like. It is not meant to uncover new ground
truths within a dataset. The models trained here will not be deployed
because they are being trained to fake data. This notebook is just a
portrait of what is possible.
